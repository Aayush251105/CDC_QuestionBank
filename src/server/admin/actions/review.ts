"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/server/admin/guard";
import { pendingReview } from "@/server/admin/queries";
import { applyDecisions, getReviewBatch } from "@/server/admin/review";
import { db } from "@/server/db";

// A07 "Approve all verified": publishes every question of each waiting
// submission that is Verified and has no duplicates to merge by hand.
export async function approveAllVerified(driveId: string): Promise<number> {
  const admin = await requireAdmin();
  const { rows } = await getReviewBatch(driveId);
  const ids = rows.filter((r) => r.bulkApprovable).map((r) => r.id);

  let done = 0;
  for (const id of ids) {
    await db.$transaction(
      async (tx) => {
        // Still waiting? Another reviewer may have got there first.
        const sub = await tx.submission.findFirst({
          where: { ...pendingReview, id },
          select: { rawQuestions: { select: { id: true } } },
        });
        if (!sub) return;
        await applyDecisions(
          tx,
          admin.id,
          id,
          sub.rawQuestions.map((q) => ({ rawId: q.id, decision: "APPROVE" })),
        );
        done++;
      },
      { timeout: 30_000 },
    );
  }
  if (done > 0) updateTag("questions"); // student pages show them at once
  refresh();
  return done;
}
