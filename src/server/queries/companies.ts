import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CompanyListItem } from "@/lib/companies";
import { db } from "@/server/db";
import { liveQuestion, visibleDrive } from "./visibility";

// Every company with at least one visible drive, with totals for the table.
export async function getCompanyList(): Promise<CompanyListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const companies = await db.company.findMany({
    where: {
      hidden: false,
      verified: true,
      drives: { some: { verified: true } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      aliases: true,
      drives: {
        where: visibleDrive,
        select: {
          year: true,
          rounds: {
            select: {
              date: true,
              _count: { select: { questions: { where: liveQuestion } } },
            },
          },
        },
      },
    },
  });

  return companies.map((c) => {
    const rounds = c.drives.flatMap((d) => d.rounds);
    const dates = rounds.flatMap((r) => (r.date ? [r.date.getTime()] : []));
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      sector: c.sector,
      aliases: c.aliases,
      years: [...new Set(c.drives.map((d) => d.year))],
      lastDrive: dates.length ? new Date(Math.max(...dates)) : null,
      drives: c.drives.length,
      questions: rounds.reduce((n, r) => n + r._count.questions, 0),
    };
  });
}

// Ids of the companies this student follows (not cached: per user).
export async function getFollowedCompanyIds(userId: string) {
  const rows = await db.bookmark.findMany({
    where: { userId, companyId: { not: null } },
    select: { companyId: true },
  });
  return new Set(rows.map((r) => r.companyId!));
}
