"use server";

import { redirect } from "next/navigation";
import {
  cleanInput,
  composeMarkdown,
  filledOptions,
  isComplete,
  MAX_QUESTIONS,
  questionTitle,
} from "@/lib/questionForm";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

export type SaveResult =
  | { ok: true; id: string; title: string; complete: boolean }
  | { ok: false; message: string };

// The student's own draft, still editable; null otherwise.
async function ownDraft(submissionId: string) {
  const user = await requireUser();
  return db.submission.findFirst({
    where: { id: submissionId, userId: user.id, status: "DRAFT" },
    select: { id: true },
  });
}

// Autosave and "Save and add another" both land here. rawId null = new question.
export async function saveQuestion(
  submissionId: string,
  rawId: string | null,
  input: unknown,
): Promise<SaveResult> {
  const draft = await ownDraft(submissionId);
  if (!draft)
    return { ok: false, message: "This draft can no longer be edited." };
  const q = cleanInput(input);
  if (!q)
    return {
      ok: false,
      message: "Could not read this question. Please try again.",
    };

  const data = {
    type: q.type,
    section: q.section || null,
    title: q.fields.title.trim() || null,
    textOriginal: composeMarkdown(q),
    fields: q.fields,
    options: ["MCQ", "APTITUDE"].includes(q.type)
      ? filledOptions(q.fields)
      : [],
    difficultyFelt: q.difficultyFelt,
    notes: q.notes.trim() || null,
  };

  let id: string;
  if (rawId) {
    const updated = await db.rawQuestion.updateMany({
      where: { id: rawId, submissionId: draft.id },
      data,
    });
    if (updated.count === 0)
      return { ok: false, message: "This question was deleted." };
    id = rawId;
  } else {
    const count = await db.rawQuestion.count({
      where: { submissionId: draft.id },
    });
    if (count >= MAX_QUESTIONS) {
      return {
        ok: false,
        message: `A submission can have at most ${MAX_QUESTIONS} questions.`,
      };
    }
    const last = await db.rawQuestion.aggregate({
      where: { submissionId: draft.id },
      _max: { order: true },
    });
    id = (
      await db.rawQuestion.create({
        data: {
          ...data,
          submissionId: draft.id,
          order: (last._max.order ?? 0) + 1,
        },
        select: { id: true },
      })
    ).id;
  }
  await db.submission.update({
    where: { id: draft.id },
    data: { lastStep: "questions" },
  });
  return { ok: true, id, title: questionTitle(q), complete: isComplete(q) };
}

export async function deleteQuestion(submissionId: string, rawId: string) {
  const draft = await ownDraft(submissionId);
  if (!draft) return { ok: false };
  await db.rawQuestion.deleteMany({
    where: { id: rawId, submissionId: draft.id },
  });
  return { ok: true };
}

// "Continue to review": needs at least one question with its text written.
export async function finishQuestions(submissionId: string) {
  const draft = await ownDraft(submissionId);
  if (!draft) return { message: "This draft can no longer be edited." };
  const questions = await db.rawQuestion.findMany({
    where: { submissionId: draft.id },
    select: { textOriginal: true },
  });
  if (!questions.some((q) => q.textOriginal.trim().length >= 10)) {
    return { message: "Add at least one question before you continue." };
  }
  await db.submission.update({
    where: { id: draft.id },
    data: { lastStep: "review" },
  });
  redirect(`/submit/${draft.id}/review`);
}
