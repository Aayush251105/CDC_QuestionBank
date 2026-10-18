import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

// Shared admin read helpers. Admin data is never cached: it changes with
// every review and must always be current.

// What waits in the review queue: sent submissions on CDC drives from
// students who are not blocked. Drive requests (unverified drives) are
// handled from Drives > Requests instead. Review goes round by round, so a
// submission whose round is not picked yet (S2) waits until it is.
export const pendingReview = {
  status: "PENDING_REVIEW",
  user: { blockedAt: null },
  roundId: { not: null },
  drive: { verified: true },
} satisfies Prisma.SubmissionWhereInput;

// The live count next to "Review queue" in the sidebar.
export function countPendingReview() {
  return db.submission.count({ where: pendingReview });
}

export const driveTitleSelect = {
  id: true,
  year: true,
  sequence: true,
  roles: true,
  company: { select: { name: true } },
} satisfies Prisma.DriveSelect;
