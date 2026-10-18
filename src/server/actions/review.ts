"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { parseReviewQuestions, studentCanEdit } from "@/lib/review";
import { stepHref } from "@/lib/submit";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

// S4 "Check the cleaned-up version" and S5 "Add the next round".

const LOCKED = "This submission can no longer be edited.";

async function ownEditable(submissionId: string) {
  const user = await requireUser();
  const s = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id },
    select: {
      id: true,
      status: true,
      reviewStartedAt: true,
      roundId: true,
      drive: { select: { status: true, verified: true } },
      rawQuestions: { select: { id: true } },
    },
  });
  return s && studentCanEdit(s) ? s : null;
}

// Writes the student's edits. Questions they removed are deleted; ids that
// are not theirs are ignored.
async function writeQuestions(
  s: NonNullable<Awaited<ReturnType<typeof ownEditable>>>,
  raw: unknown,
) {
  const own = new Set(s.rawQuestions.map((q) => q.id));
  const list = parseReviewQuestions(raw).filter((q) => own.has(q.id));
  const keep = new Set(list.map((q) => q.id));
  await db.$transaction([
    db.rawQuestion.deleteMany({
      where: { submissionId: s.id, id: { notIn: [...keep] } },
    }),
    ...list.map((q) =>
      db.rawQuestion.update({
        where: { id: q.id },
        data: {
          type: q.type,
          textCleaned: q.cleaned,
          options: q.options.length ? q.options : Prisma.DbNull,
          suggestedTags: q.topics,
          suggestedDifficulty: q.difficulty,
        },
      }),
    ),
  ]);
  return list;
}

// Autosave of the review page.
export async function saveReview(submissionId: string, questions: unknown) {
  const s = await ownEditable(submissionId);
  if (!s) return { ok: false, message: LOCKED };
  await writeQuestions(s, questions);
  return { ok: true };
}

export type SubmitResult = { message: string; emptyIds?: string[] };

// "Submit for review" (or "Save changes" after sending): the honour
// statement is required every time.
export async function submitForReview(
  submissionId: string,
  input: { questions: unknown; honour: unknown; credit: unknown },
): Promise<SubmitResult | undefined> {
  const s = await ownEditable(submissionId);
  if (!s) return { message: LOCKED };
  if (s.drive.verified && s.drive.status === "CLOSED") {
    return {
      message: "This drive is closed, so submissions are switched off.",
    };
  }
  if (!s.roundId) return { message: "Choose the round first (step 2)." };
  if (input.honour !== true) {
    return { message: "Tick the honour statement to submit." };
  }

  const list = await writeQuestions(s, input.questions);
  if (list.length === 0) {
    return { message: "Add at least one question before you submit." };
  }
  const empty = list.filter((q) => !q.cleaned).map((q) => q.id);
  if (empty.length) {
    return {
      message: "Some questions are empty. Write them or remove them.",
      emptyIds: empty,
    };
  }

  const now = new Date();
  await db.submission.update({
    where: { id: s.id },
    data: {
      status: "PENDING_REVIEW",
      // The first send counts; later edits keep it in the queue.
      submittedAt: s.status === "DRAFT" ? now : undefined,
      honourAcceptedAt: now,
      credit: input.credit === true,
      lastStep: "review",
    },
  });
  redirect(`/submit/${s.id}/done`);
}

// S6 "Withdraw": only while waiting and before the CDC starts the review.
// The text is deleted; the round is freed so it can be submitted again
// (one submission per round). The row stays as WITHDRAWN for the CDC's log.
export async function withdrawSubmission(submissionId: string) {
  const user = await requireUser();
  const done = await db.$transaction(async (tx) => {
    // The status check and the change are one step, so a review that
    // starts at the same moment wins.
    const { count } = await tx.submission.updateMany({
      where: {
        id: submissionId,
        userId: user.id,
        status: "PENDING_REVIEW",
        reviewStartedAt: null,
      },
      data: {
        status: "WITHDRAWN",
        rawText: null,
        notes: null,
        roundId: null,
        credit: false,
      },
    });
    if (count === 0) return false;
    await tx.rawQuestion.deleteMany({ where: { submissionId } });
    await tx.scanPage.deleteMany({ where: { submissionId } });
    return true;
  });
  if (!done) return { message: LOCKED };
  redirect("/me/submissions?withdrawn=1");
}

// S5 "Add the next round": a new draft on the same drive and role, straight
// to round details. Reuses an open draft for that drive and role.
export async function startNextRound(submissionId: string) {
  const user = await requireUser();
  const s = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id },
    select: {
      driveId: true,
      role: true,
      enteredWithPin: true,
      drive: { select: { status: true, verified: true } },
    },
  });
  if (!s) redirect("/submit");
  if (s.drive.verified && s.drive.status === "CLOSED") redirect("/submit");

  const existing = await db.submission.findFirst({
    where: {
      userId: user.id,
      driveId: s.driveId,
      role: s.role,
      status: "DRAFT",
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, lastStep: true },
  });
  if (existing) redirect(stepHref(existing.id, existing.lastStep));
  const draft = await db.submission.create({
    data: {
      userId: user.id,
      driveId: s.driveId,
      role: s.role,
      enteredWithPin: s.enteredWithPin,
      lastStep: "round",
    },
    select: { id: true },
  });
  redirect(`/submit/${draft.id}/round`);
}
