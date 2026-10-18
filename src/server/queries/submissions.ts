import "server-only";
import { db } from "@/server/db";

// My submissions (page 10) and Submission status (S6). Always filtered by
// userId. Never select verificationTag, review reasons or anything about
// other submitters (CLAUDE.md section 6 and 2a.2).

export async function listOwnSubmissions(userId: string) {
  return db.submission.findMany({
    where: { userId, status: { not: "WITHDRAWN" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      lastStep: true,
      updatedAt: true,
      submittedAt: true,
      reviewedAt: true,
      role: true,
      round: { select: { name: true } },
      drive: {
        select: {
          year: true,
          sequence: true,
          companyId: true,
          company: { select: { name: true } },
        },
      },
      _count: { select: { rawQuestions: true } },
    },
  });
}

export async function getOwnSubmissionStatus(id: string, userId: string) {
  return db.submission.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      lastStep: true,
      role: true,
      mode: true,
      rawText: true, // only to say "typed"
      credit: true,
      testDate: true,
      platform: true,
      durationMin: true,
      sections: true,
      submittedAt: true,
      reviewStartedAt: true,
      reviewedAt: true,
      updatedAt: true,
      round: { select: { name: true } },
      drive: {
        select: {
          year: true,
          sequence: true,
          companyId: true,
          company: { select: { name: true } },
        },
      },
      rawQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          textCleaned: true,
          textOriginal: true,
          suggestedDifficulty: true,
        },
      },
      _count: { select: { scanPages: true } },
    },
  });
}

// "2025" or "2025 · B" for each drive in the list, with one query.
export async function visitCounts(
  drives: { companyId: string; year: number }[],
) {
  if (drives.length === 0) return new Map<string, number>();
  const rows = await db.drive.groupBy({
    by: ["companyId", "year"],
    where: {
      OR: drives.map((d) => ({ companyId: d.companyId, year: d.year })),
    },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [`${r.companyId}:${r.year}`, r._count._all] as const),
  );
}
