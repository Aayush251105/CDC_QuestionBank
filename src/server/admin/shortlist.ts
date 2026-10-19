import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { checkSubmission, type Account } from "@/lib/shortlist";
import { db } from "@/server/db";

// Every account a shortlist row could match: students who have signed in.
export function loadAccounts(): Promise<Account[]> {
  return db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true, rollNo: true },
  });
}

// Re-tags every sent submission of a round from its newest shortlist
// (Verified, Likely or Not found). Runs after each import.
export async function recheckRound(
  tx: Prisma.TransactionClient,
  roundId: string,
) {
  const upload = await tx.shortlistUpload.findFirst({
    where: { roundId },
    orderBy: { createdAt: "desc" },
    select: { entries: { select: { matchedUserId: true, match: true } } },
  });
  const submissions = await tx.submission.findMany({
    where: { roundId, status: { not: "DRAFT" } },
    select: { id: true, userId: true, verificationTag: true },
  });
  for (const s of submissions) {
    const tag = checkSubmission(upload?.entries ?? null, s.userId);
    if (tag !== s.verificationTag) {
      await tx.submission.update({
        where: { id: s.id },
        data: { verificationTag: tag },
      });
    }
  }
  return submissions.length;
}

// A06: the drive's rounds and every earlier upload with its match counts.
export async function getShortlistPage(driveId: string) {
  const [rounds, uploads] = await Promise.all([
    db.round.findMany({
      where: { driveId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        name: true,
        _count: {
          select: { submissions: { where: { status: { not: "DRAFT" } } } },
        },
      },
    }),
    db.shortlistUpload.findMany({
      where: { round: { driveId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        round: { select: { order: true } },
        uploadedBy: { select: { name: true } },
        entries: { select: { match: true } },
      },
    }),
  ]);
  return {
    rounds: rounds.map((r) => ({
      id: r.id,
      order: r.order,
      name: r.name,
      submissions: r._count.submissions,
    })),
    uploads: uploads.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      createdAt: u.createdAt,
      round: u.round.order,
      by: u.uploadedBy.name,
      rows: u.entries.length,
      unmatched: u.entries.filter((e) => e.match === "NONE").length,
    })),
  };
}
