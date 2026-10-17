"use server";

import { redirect } from "next/navigation";
import { MAX_QUESTIONS } from "@/lib/aiQuestions";
import { roundTypeLabel } from "@/lib/labels";
import { aiEnabled, readPhoto, structureQuestions } from "@/server/ai";
import { AiError } from "@/server/ai/groq";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

// S3 "Add the questions" (CLAUDE.md 2a.9): the student's notes and photos;
// the AI turns them into questions for the review step.

const MAX_TEXT = 20_000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const limits = () => ({
  pagesPerSubmission: num(process.env.UPLOAD_MAX_PAGES, 10),
  // Photos are shrunk in the browser first; this is a hard cap per photo.
  bytesPerPhoto: Math.min(num(process.env.UPLOAD_MAX_MB, 15), 4) * 1024 * 1024,
  pagesPerDay: num(process.env.UPLOAD_DAILY_CAP, 30),
});

async function ownDraft(submissionId: string) {
  const user = await requireUser();
  const draft = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id, status: "DRAFT" },
    select: { id: true, roundId: true },
  });
  return draft ? { ...draft, userId: user.id } : null;
}

// Autosave of the big text box.
export async function saveNotes(submissionId: string, text: unknown) {
  const draft = await ownDraft(submissionId);
  if (!draft)
    return { ok: false, message: "This draft can no longer be edited." };
  const value = typeof text === "string" ? text.slice(0, MAX_TEXT) : "";
  await db.submission.update({
    where: { id: draft.id },
    data: { rawText: value || null, lastStep: "questions" },
  });
  return { ok: true };
}

export type PhotoPage = {
  id: string;
  pageNo: number;
  status: "READING" | "DONE" | "UNREADABLE";
  text: string;
};

export type PhotoResult =
  { ok: true; page: PhotoPage } | { ok: false; message: string };

// Reads one photo with the AI, keeps only the text and drops the bytes.
// Pages are read one at a time in the request (no queue).
export async function addPhoto(form: FormData): Promise<PhotoResult> {
  const draft = await ownDraft(String(form.get("submissionId") ?? ""));
  if (!draft)
    return { ok: false, message: "This draft can no longer be edited." };
  const file = form.get("photo");
  if (!(file instanceof File))
    return { ok: false, message: "No photo was received." };
  if (!PHOTO_TYPES.includes(file.type)) {
    return {
      ok: false,
      message: "Use a JPG, PNG or WebP photo. PDF is not supported yet.",
    };
  }
  const max = limits();
  if (file.size > max.bytesPerPhoto) {
    return {
      ok: false,
      message: "That photo is too large. Try a smaller one.",
    };
  }

  const pages = await db.scanPage.count({ where: { submissionId: draft.id } });
  if (pages >= max.pagesPerSubmission) {
    return {
      ok: false,
      message: `You can add up to ${max.pagesPerSubmission} photos per submission.`,
    };
  }
  // Daily cap per student, counted from midnight India time.
  const ist = new Date(Date.now() + 5.5 * 3600e3);
  const midnight = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) -
      5.5 * 3600e3,
  );
  const today = await db.scanPage.count({
    where: {
      submission: { userId: draft.userId },
      createdAt: { gte: midnight },
    },
  });
  if (today >= max.pagesPerDay) {
    return {
      ok: false,
      message:
        "You have reached today's photo limit. Type the rest, or try tomorrow.",
    };
  }

  const last = await db.scanPage.aggregate({
    where: { submissionId: draft.id },
    _max: { pageNo: true },
  });
  const page = await db.scanPage.create({
    data: {
      submissionId: draft.id,
      pageNo: (last._max.pageNo ?? 0) + 1,
      readStatus: "READING",
    },
    select: { id: true, pageNo: true },
  });

  let readable = false;
  let text = "";
  try {
    // Held in memory for this call only; never written anywhere.
    const bytes = Buffer.from(await file.arrayBuffer());
    ({ readable, text } = await readPhoto(bytes, file.type));
  } catch (e) {
    console.error("[addPhoto]", e instanceof AiError ? e.message : e);
  }
  const status = readable ? "DONE" : "UNREADABLE";
  await db.scanPage.update({
    where: { id: page.id },
    data: { readStatus: status, extractedText: readable ? text : null },
  });
  await db.submission.update({
    where: { id: draft.id },
    data: { mode: "SCAN", lastStep: "questions" },
  });
  return { ok: true, page: { id: page.id, pageNo: page.pageNo, status, text } };
}

export async function removePhoto(submissionId: string, pageId: string) {
  const draft = await ownDraft(submissionId);
  if (!draft) return { ok: false };
  await db.scanPage.deleteMany({
    where: { id: pageId, submissionId: draft.id },
  });
  return { ok: true };
}

// "Continue to review": the AI splits everything into questions. Questions
// made earlier for this draft are replaced (the student checks them in S4).
export async function prepareReview(submissionId: string) {
  const draft = await ownDraft(submissionId);
  if (!draft) return { message: "This draft can no longer be edited." };
  const s = await db.submission.findUniqueOrThrow({
    where: { id: draft.id },
    select: {
      rawText: true,
      sections: true,
      round: { select: { name: true } },
      drive: { select: { year: true, company: { select: { name: true } } } },
      scanPages: {
        where: { readStatus: "DONE" },
        orderBy: { pageNo: "asc" },
        select: { pageNo: true, extractedText: true },
      },
    },
  });

  const parts = [
    { text: s.rawText?.trim() ?? "", photo: null },
    ...s.scanPages.map((p) => ({
      text: p.extractedText?.trim() ?? "",
      photo: p.pageNo,
    })),
  ].filter((p) => p.text);
  if (parts.length === 0) {
    return {
      message: "Type your questions or add a photo before you continue.",
    };
  }

  const sections = Array.isArray(s.sections)
    ? (s.sections as { name: string }[]).map((x) => x.name).filter(Boolean)
    : [];
  const context = [
    s.drive.company.name,
    String(s.drive.year),
    s.round?.name ?? roundTypeLabel.OA,
    sections.length ? `sections: ${sections.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const topics = (await db.tag.findMany({ select: { name: true } })).map(
    (t) => t.name,
  );

  let questions;
  try {
    questions = await structureQuestions(parts, context, topics);
  } catch (e) {
    console.error("[prepareReview]", e instanceof AiError ? e.message : e);
    return {
      message:
        e instanceof AiError && e.message.includes("busy")
          ? "The AI is busy right now. Please try again in a minute."
          : "We could not process your questions just now. Please try again.",
    };
  }
  if (questions.length === 0) {
    return {
      message:
        "We could not find any questions in what you added. Check the text and try again.",
    };
  }

  await db.$transaction([
    db.rawQuestion.deleteMany({ where: { submissionId: draft.id } }),
    ...questions.slice(0, MAX_QUESTIONS).map((q, i) =>
      db.rawQuestion.create({
        data: {
          submissionId: draft.id,
          order: i + 1,
          type: q.type,
          title: q.title,
          textOriginal: q.original,
          textCleaned: q.cleaned,
          options: q.options,
          // What the student wrote as the answer, and the parts the AI wrote
          // itself (shown as "AI added" on review; CLAUDE.md 2a.11).
          fields: {
            ...(q.answer && { answer: q.answer }),
            aiAdded: q.aiAdded,
          },
          suggestedTags: q.topics,
          suggestedDifficulty: q.difficulty,
          scanPageNo: q.photo,
        },
      }),
    ),
    db.submission.update({
      where: { id: draft.id },
      data: { lastStep: "review" },
    }),
  ]);
  redirect(`/submit/${draft.id}/review`);
}

// Tells the page whether photo reading works on this server.
export async function photoReadingOn() {
  return aiEnabled();
}
