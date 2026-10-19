"use server";

import { refresh, updateTag } from "next/cache";
import { slugify } from "@/lib/slug";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

// A10 Companies. Student pages show company names, so every change
// refreshes their cache.

type Result = { error: string | null };

const aliasList = (text: string) => [
  ...new Set(
    text
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
  ),
];

async function nameTaken(name: string, exceptId?: string) {
  const found = await db.company.findFirst({
    where: {
      id: exceptId ? { not: exceptId } : undefined,
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { slug: slugify(name) },
      ],
    },
    select: { id: true },
  });
  return Boolean(found);
}

export async function createCompany(input: {
  name: string;
  sector: string;
  aliases: string;
}): Promise<Result> {
  const admin = await requireAdmin();
  const name = input.name.trim().slice(0, 100);
  if (!name || !slugify(name)) return { error: "Enter the company name." };
  if (await nameTaken(name))
    return { error: `${name} is already in the list.` };
  await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        slug: slugify(name),
        sector: input.sector.trim() || null,
        aliases: aliasList(input.aliases),
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "company_create",
        targetType: "company",
        targetId: company.id,
        summary: name,
      },
      tx,
    );
  });
  updateTag("questions");
  refresh();
  return { error: null };
}

// Renaming keeps the URL (slug) so links students shared still work.
export async function updateCompany(input: {
  id: string;
  name: string;
  sector: string;
  aliases: string;
  hidden: boolean;
}): Promise<Result> {
  const admin = await requireAdmin();
  const company = await db.company.findUnique({
    where: { id: input.id },
    select: { id: true, name: true, hidden: true },
  });
  if (!company) return { error: "This company no longer exists." };
  const name = input.name.trim().slice(0, 100);
  if (!name) return { error: "Enter the company name." };
  if (
    name.toLowerCase() !== company.name.toLowerCase() &&
    (await nameTaken(name, company.id))
  ) {
    return { error: `${name} is already in the list.` };
  }
  const changes = [
    name !== company.name && `renamed from ${company.name}`,
    input.hidden !== company.hidden &&
      (input.hidden ? "hidden from students" : "shown to students"),
  ].filter(Boolean);
  await db.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: company.id },
      data: {
        name,
        sector: input.sector.trim() || null,
        aliases: aliasList(input.aliases),
        hidden: input.hidden,
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "company_edit",
        targetType: "company",
        targetId: company.id,
        summary: name,
        detail: changes.join("; ") || "Sector or aliases",
      },
      tx,
    );
  });
  updateTag("questions");
  refresh();
  return { error: null };
}

// Merge a duplicate into the real company: its drives, follows and names
// move over (its name becomes an alias), and it is hidden. A drive whose
// year clashes becomes another visit that year ("2025 · B").
export async function mergeCompany(
  fromId: string,
  intoId: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (fromId === intoId) return { error: "Pick a different company." };
  const [from, into] = await Promise.all([
    db.company.findFirst({
      where: { id: fromId, mergedIntoId: null },
      select: {
        id: true,
        name: true,
        aliases: true,
        drives: {
          orderBy: [{ year: "asc" }, { sequence: "asc" }],
          select: { id: true, year: true },
        },
        bookmarks: { select: { id: true, userId: true } },
      },
    }),
    db.company.findFirst({
      where: { id: intoId, mergedIntoId: null },
      select: {
        id: true,
        name: true,
        aliases: true,
        verified: true,
        bookmarks: { select: { userId: true } },
      },
    }),
  ]);
  if (!from || !into) return { error: "Pick a company to merge into." };

  await db.$transaction(
    async (tx) => {
      for (const d of from.drives) {
        const last = await tx.drive.aggregate({
          where: { companyId: into.id, year: d.year },
          _max: { sequence: true },
        });
        await tx.drive.update({
          where: { id: d.id },
          data: { companyId: into.id, sequence: (last._max.sequence ?? 0) + 1 },
        });
      }
      const following = new Set(into.bookmarks.map((b) => b.userId));
      for (const b of from.bookmarks) {
        if (following.has(b.userId)) continue;
        await tx.bookmark.update({
          where: { id: b.id },
          data: { companyId: into.id },
        });
      }
      const aliases = [
        ...new Set([...into.aliases, from.name, ...from.aliases]),
      ].filter((a) => a.toLowerCase() !== into.name.toLowerCase());
      await tx.company.update({ where: { id: into.id }, data: { aliases } });
      await tx.company.update({
        where: { id: from.id },
        data: { mergedIntoId: into.id, hidden: true },
      });
      await logAction(
        {
          adminId: admin.id,
          action: "company_merge",
          targetType: "company",
          targetId: from.id,
          summary: from.name,
          detail: `Merged into ${into.name}; ${from.drives.length} drive(s) moved`,
        },
        tx,
      );
    },
    { timeout: 30_000 },
  );
  updateTag("questions");
  refresh();
  return { error: null };
}
