"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { requireAdmin } from "@/server/admin/guard";
import { pendingReview } from "@/server/admin/queries";
import {
  applyDecisions,
  getReviewBatch,
  type Decision,
} from "@/server/admin/review";
import { db } from "@/server/db";

const TYPES: QuestionType[] = ["MCQ", "CODING", "APTITUDE", "SQL", "WRITTEN"];
const LEVELS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

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

// A08 "Save and stay" / "Save and go to next". Every question of the
// submission needs a decision; a merge needs a published question to go
// into. After saving, the student sees only "Reviewed".
export async function saveReview(
  driveId: string,
  submissionId: string,
  decisions: Decision[],
  goNext: boolean,
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const sub = await db.submission.findFirst({
    where: { ...pendingReview, id: submissionId, driveId },
    select: { rawQuestions: { select: { id: true } } },
  });
  if (!sub) return { error: "This submission has already been reviewed." };

  const clean: Decision[] = [];
  for (const raw of sub.rawQuestions) {
    const d = decisions.find((x) => x.rawId === raw.id);
    if (!d || !["APPROVE", "MERGE", "REJECT"].includes(d.decision)) {
      return { error: "Pick Approve, Merge or Reject for every question." };
    }
    if (d.decision === "MERGE") {
      const target = d.mergeInto
        ? await db.question.findFirst({
            where: { id: d.mergeInto, unpublishedAt: null },
            select: { id: true },
          })
        : null;
      if (!target)
        return { error: "Pick the published question to merge into." };
    }
    if (d.decision === "APPROVE" && !(d.text ?? "").trim()) {
      return { error: "A question to approve needs its text." };
    }
    clean.push({
      rawId: raw.id,
      decision: d.decision,
      mergeInto: d.mergeInto,
      reason: d.reason?.slice(0, 200),
      title: d.title?.slice(0, 200),
      text: d.text,
      type: TYPES.includes(d.type!) ? d.type : undefined,
      difficulty: LEVELS.includes(d.difficulty!) ? d.difficulty : undefined,
      topics: d.topics?.slice(0, 20),
    });
  }

  await db.$transaction(
    (tx) => applyDecisions(tx, admin.id, submissionId, clean),
    {
      timeout: 30_000,
    },
  );
  updateTag("questions");

  if (goNext) {
    const next = await db.submission.findFirst({
      where: { ...pendingReview, driveId },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    redirect(
      next
        ? `/admin/drives/${driveId}/review/${next.id}`
        : `/admin/drives/${driveId}/review`,
    );
  }
  refresh();
  return { error: null };
}
