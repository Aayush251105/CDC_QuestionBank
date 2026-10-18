"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  defaultCloseDate,
  parseDateInput,
  roundNames,
  type RoundTypeKey,
} from "@/lib/admin";
import { formatPin } from "@/lib/pin";
import { slugify } from "@/lib/slug";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { freshPin } from "@/server/admin/pin";
import { getSettings } from "@/server/admin/settings";
import { db } from "@/server/db";

// A02 Requests > Decline. The request leaves the list and its submissions
// are closed as not published; the student only ever sees "Reviewed"
// (CLAUDE.md 2a.2). Nothing is deleted.
export async function declineDriveRequest(driveId: string) {
  const admin = await requireAdmin();
  const drive = await db.drive.findFirst({
    where: { id: driveId, verified: false, requestResolvedAt: null },
    select: { id: true, roles: true, company: { select: { name: true } } },
  });
  if (!drive) return;

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.drive.update({
      where: { id: drive.id },
      data: { requestResolvedAt: now },
    });
    const closed = await tx.submission.updateMany({
      where: {
        driveId: drive.id,
        status: { in: ["PENDING_REVIEW", "PROCESSING"] },
      },
      data: {
        status: "NOT_PUBLISHED",
        reviewStartedAt: now,
        reviewedAt: now,
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "request_decline",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: [drive.company.name, drive.roles.join(", ")]
          .filter(Boolean)
          .join(" · "),
        detail: `Drive request declined; ${closed.count} submission(s) closed`,
      },
      tx,
    );
  });
  refresh();
}

// ---------- A03 New drive ----------

export type DriveFormState = { error: string | null };

const ROUND_TYPES: RoundTypeKey[] = ["OA", "TECHNICAL", "HR", "GD"];

type RoundInput = {
  id: string | null; // set for a round that already exists (edit form)
  type: RoundTypeKey;
  date: Date | null;
  platform: string | null;
  durationMin: number | null;
};

function parseRounds(json: string): RoundInput[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  const rounds: RoundInput[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const type = String(r?.type ?? "") as RoundTypeKey;
    if (!ROUND_TYPES.includes(type)) return null;
    const minutes = Number(r.durationMin);
    rounds.push({
      id: typeof r.id === "string" && r.id ? r.id : null,
      type,
      date: parseDateInput(String(r.date ?? "")),
      platform: String(r.platform ?? "").trim() || null,
      durationMin: Number.isInteger(minutes) && minutes > 0 ? minutes : null,
    });
  }
  return rounds;
}

// Creates a drive with its rounds. "Save as draft", or a drive without
// rounds yet, stays a Draft (A00b step 1). From a drive request, the
// student's submissions move onto the new drive's rounds, in order.
export async function createDrive(
  _prev: DriveFormState,
  form: FormData,
): Promise<DriveFormState> {
  const admin = await requireAdmin();
  const text = (key: string) => String(form.get(key) ?? "").trim();

  const requestId = text("requestId") || null;
  const request = requestId
    ? await db.drive.findFirst({
        where: { id: requestId, verified: false, requestResolvedAt: null },
        select: {
          id: true,
          company: true,
          rounds: { orderBy: { order: "asc" }, select: { id: true } },
        },
      })
    : null;
  if (requestId && !request) {
    return { error: "This drive request has already been handled." };
  }

  const companyName = text("company");
  if (!companyName) return { error: "Pick a company." };
  let company = await db.company.findFirst({
    where: {
      verified: true,
      mergedIntoId: null,
      OR: [
        { name: { equals: companyName, mode: "insensitive" } },
        { aliases: { has: companyName } },
      ],
    },
  });
  if (
    !company &&
    request &&
    request.company.name.toLowerCase() === companyName.toLowerCase()
  ) {
    company = request.company; // verified below, with the drive
  }
  if (!company) {
    return {
      error: `"${companyName}" is not in the company list. Add it on the Companies page first.`,
    };
  }

  const year = Number(text("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Pick a year." };
  }
  const roles = text("roles")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  if (roles.length === 0) return { error: "Add at least one role." };

  const rounds = parseRounds(text("rounds"));
  if (!rounds) return { error: "Check the rounds and try again." };

  const roundTimes = rounds.flatMap((r) => (r.date ? [r.date.getTime()] : []));
  const opensAt =
    parseDateInput(text("opensAt")) ??
    (roundTimes.length ? new Date(Math.min(...roundTimes)) : null);
  const closesAt =
    parseDateInput(text("closesAt")) ??
    defaultCloseDate(
      rounds.map((r) => r.date),
      (await getSettings()).pinWindowDays,
    );
  if (opensAt && closesAt && closesAt < opensAt) {
    return { error: "The close date is before the open date." };
  }

  const requirePin = form.get("requirePin") === "on";
  const pin =
    requirePin && form.get("generatePin") === "on" ? await freshPin() : null;
  const status =
    text("intent") === "draft" || rounds.length === 0 ? "DRAFT" : "OPEN";
  const names = roundNames(rounds.map((r) => r.type));
  const last = await db.drive.aggregate({
    where: { companyId: company.id, year },
    _max: { sequence: true },
  });
  const { id: companyId, name: companyLabel, verified } = company;

  const driveId = await db.$transaction(async (tx) => {
    if (!verified) {
      await tx.company.update({
        where: { id: companyId },
        data: { verified: true },
      });
    }
    const drive = await tx.drive.create({
      data: {
        companyId,
        year,
        sequence: (last._max.sequence ?? 0) + 1,
        season: text("season") || null,
        roles,
        ctcBand: text("ctcBand") || null,
        eligibility: text("eligibility") || null,
        status,
        opensAt,
        closesAt,
        requirePin,
        submissionPin: pin,
        pinCreatedAt: pin ? new Date() : null,
        createdById: admin.id,
        rounds: {
          create: rounds.map((r, i) => ({
            order: i + 1,
            slug: slugify(names[i]),
            name: names[i],
            type: r.type,
            date: r.date,
            platform: r.platform,
            durationMin: r.durationMin,
          })),
        },
      },
      select: {
        id: true,
        rounds: { orderBy: { order: "asc" }, select: { id: true } },
      },
    });
    const summary = `${companyLabel} ${year} · ${roles.join(", ")}`;
    await logAction(
      {
        adminId: admin.id,
        action: "drive_create",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary,
        detail: `${status === "DRAFT" ? "Saved as draft" : "Created"} with ${rounds.length} round(s)`,
      },
      tx,
    );
    if (pin) {
      await logAction(
        {
          adminId: admin.id,
          action: "pin_generate",
          targetType: "drive",
          targetId: drive.id,
          driveId: drive.id,
          summary,
          detail: `PIN ${formatPin(pin)}`,
        },
        tx,
      );
    }

    if (request) {
      // Move the request's submissions round by round. A student who
      // already has a submission on the target round keeps both apart.
      let moved = 0;
      for (const [i, from] of request.rounds.entries()) {
        const to = drive.rounds[i];
        if (!to) break;
        const subs = await tx.submission.findMany({
          where: { roundId: from.id },
          select: { id: true, userId: true },
        });
        for (const s of subs) {
          const clash = await tx.submission.findUnique({
            where: { userId_roundId: { userId: s.userId, roundId: to.id } },
            select: { id: true },
          });
          if (clash) continue;
          await tx.submission.update({
            where: { id: s.id },
            data: { roundId: to.id, driveId: drive.id },
          });
          moved++;
        }
      }
      // Submissions still on the request (no round picked, or a round the
      // new drive does not have) move to the new drive without a round.
      const rest = await tx.submission.updateMany({
        where: { driveId: request.id },
        data: { driveId: drive.id, roundId: null },
      });
      moved += rest.count;
      await tx.drive.update({
        where: { id: request.id },
        data: { requestResolvedAt: new Date() },
      });
      await logAction(
        {
          adminId: admin.id,
          action: "request_attach",
          targetType: "drive",
          targetId: request.id,
          driveId: drive.id,
          summary,
          detail: `Drive request turned into this drive; ${moved} submission(s) moved`,
        },
        tx,
      );
    }
    return drive.id;
  });

  redirect(pin ? `/admin/drives/${driveId}/pin` : `/admin/drives/${driveId}`);
}

// ---------- A04 Drive detail: edit, open and close ----------

// Saves the Edit drive form. Company and year stay fixed. Existing rounds
// keep their URL (slug) even when renamed; a round that already has
// submissions, questions or a shortlist cannot be removed.
export async function updateDrive(
  _prev: DriveFormState,
  form: FormData,
): Promise<DriveFormState> {
  const admin = await requireAdmin();
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const drive = await db.drive.findFirst({
    where: { id: text("driveId"), verified: true },
    select: {
      id: true,
      year: true,
      status: true,
      company: { select: { name: true } },
      rounds: {
        select: {
          id: true,
          order: true,
          slug: true,
          name: true,
          _count: {
            select: {
              submissions: true,
              questions: true,
              shortlistUploads: true,
            },
          },
        },
      },
    },
  });
  if (!drive) return { error: "This drive no longer exists." };

  const roles = text("roles")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  if (roles.length === 0) return { error: "Add at least one role." };
  const rounds = parseRounds(text("rounds"));
  if (!rounds) return { error: "Check the rounds and try again." };
  if (rounds.length === 0 && drive.status === "OPEN") {
    return { error: "An open drive needs at least one round." };
  }

  const keep = new Set(rounds.flatMap((r) => (r.id ? [r.id] : [])));
  const removed = drive.rounds.filter((r) => !keep.has(r.id));
  const stuck = removed.find(
    (r) =>
      r._count.submissions + r._count.questions + r._count.shortlistUploads > 0,
  );
  if (stuck) {
    return {
      error: `${stuck.name} has submissions, questions or a shortlist, so it cannot be removed.`,
    };
  }
  if (rounds.some((r) => r.id && !drive.rounds.some((x) => x.id === r.id))) {
    return { error: "Check the rounds and try again." };
  }

  const opensAt = parseDateInput(text("opensAt"));
  const closesAt = parseDateInput(text("closesAt"));
  if (opensAt && closesAt && closesAt < opensAt) {
    return { error: "The close date is before the open date." };
  }

  const names = roundNames(rounds.map((r) => r.type));
  const usedSlugs = new Set(
    drive.rounds.filter((r) => keep.has(r.id)).map((r) => r.slug),
  );

  await db.$transaction(async (tx) => {
    if (removed.length) {
      await tx.round.deleteMany({
        where: { id: { in: removed.map((r) => r.id) } },
      });
    }
    // Move kept rounds out of the way so the new order never clashes.
    await tx.round.updateMany({
      where: { driveId: drive.id },
      data: { order: { increment: 1000 } },
    });
    for (const [i, r] of rounds.entries()) {
      const data = {
        order: i + 1,
        name: names[i],
        type: r.type,
        date: r.date,
        platform: r.platform,
        durationMin: r.durationMin,
      };
      if (r.id) {
        await tx.round.update({ where: { id: r.id }, data });
      } else {
        let slug = slugify(names[i]);
        if (usedSlugs.has(slug)) slug = `${slug}-${i + 1}`;
        usedSlugs.add(slug);
        await tx.round.create({ data: { ...data, slug, driveId: drive.id } });
      }
    }
    await tx.drive.update({
      where: { id: drive.id },
      data: {
        season: text("season") || null,
        roles,
        ctcBand: text("ctcBand") || null,
        eligibility: text("eligibility") || null,
        opensAt,
        closesAt,
        requirePin: form.get("requirePin") === "on",
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "drive_edit",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: `${drive.company.name} ${drive.year}`,
        detail: `${rounds.length} round(s)${removed.length ? `, ${removed.length} removed` : ""}`,
      },
      tx,
    );
  });

  redirect(`/admin/drives/${drive.id}`);
}

// Close drive, Reopen drive, and Open drive for a draft (A04 header).
// Closing never touches submissions already made (A00b step 6).
export async function setDriveStatus(
  driveId: string,
  to: "OPEN" | "CLOSED",
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const drive = await db.drive.findFirst({
    where: { id: driveId, verified: true },
    select: {
      id: true,
      year: true,
      status: true,
      company: { select: { name: true } },
      _count: { select: { rounds: true } },
    },
  });
  if (!drive || drive.status === to) return { error: null };
  if (to === "OPEN" && drive._count.rounds === 0) {
    return { error: "Add at least one round before opening the drive." };
  }
  await db.$transaction(async (tx) => {
    await tx.drive.update({ where: { id: drive.id }, data: { status: to } });
    await logAction(
      {
        adminId: admin.id,
        action: to === "OPEN" ? "drive_open" : "drive_close",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: `${drive.company.name} ${drive.year}`,
      },
      tx,
    );
  });
  refresh();
  return { error: null };
}
