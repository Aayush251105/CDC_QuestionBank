"use server";

import { refresh, updateTag } from "next/cache";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

// A09 Published questions. Changes go live at once (the student pages'
// "questions" cache is refreshed) and are written to the audit log.

const TYPES: QuestionType[] = ["MCQ", "CODING", "APTITUDE", "SQL", "WRITTEN"];
const LEVELS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

async function context(id: string) {
  return db.question.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      round: {
        select: {
          drive: {
            select: {
              id: true,
              year: true,
              company: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}
type Context = NonNullable<Awaited<ReturnType<typeof context>>>;
const label = (q: Context) =>
  `${q.round.drive.company.name} ${q.round.drive.year} · ${q.title}`;

export async function updateQuestion(input: {
  id: string;
  title: string;
  text: string;
  type: string;
  difficulty: string;
  topics: string[];
}): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const q = await context(input.id);
  if (!q) return { error: "This question no longer exists." };
  const title = input.title.trim().slice(0, 200);
  const text = input.text.trim();
  if (!title || !text)
    return { error: "A question needs a title and its text." };
  const type = TYPES.find((t) => t === input.type);
  const difficulty = LEVELS.find((l) => l === input.difficulty);
  if (!type || !difficulty) return { error: "Pick a type and a difficulty." };

  const tags = await db.tag.findMany({ select: { id: true, name: true } });
  const wanted = new Set(input.topics.map((t) => t.trim().toLowerCase()));
  const tagIds = tags
    .filter((t) => wanted.has(t.name.toLowerCase()))
    .map((t) => t.id);

  await db.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: q.id },
      data: {
        title,
        bodyMarkdown: text,
        type,
        difficulty,
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "question_edit",
        targetType: "question",
        targetId: q.id,
        driveId: q.round.drive.id,
        summary: label({ ...q, title }),
        detail:
          title !== q.title
            ? `Renamed from "${q.title}"`
            : "Edited text or topics",
      },
      tx,
    );
  });
  updateTag("questions");
  refresh();
  return { error: null };
}

// Unpublish hides the question from students; Republish shows it again.
// Nothing is deleted.
export async function setQuestionLive(
  id: string,
  live: boolean,
  reason?: string,
) {
  const admin = await requireAdmin();
  const q = await context(id);
  if (!q) return;
  await db.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: { unpublishedAt: live ? null : new Date() },
    });
    await logAction(
      {
        adminId: admin.id,
        action: live ? "republish" : "unpublish",
        targetType: "question",
        targetId: id,
        driveId: q.round.drive.id,
        summary: label(q),
        reason: reason?.trim().slice(0, 200) || undefined,
        detail: reason?.trim().slice(0, 200) || undefined,
      },
      tx,
    );
  });
  updateTag("questions");
  refresh();
}

// "Merge with another question" (across years): the other question keeps
// its wording and gains this one's sources, credits, rounds and bookmarks;
// this one is unpublished.
export async function mergeQuestion(
  fromId: string,
  intoId: string,
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (fromId === intoId) return { error: "Pick a different question." };
  const [from, into] = await Promise.all([
    db.question.findUnique({
      where: { id: fromId },
      select: {
        id: true,
        roundId: true,
        creditedUserIds: true,
        sources: { select: { rawQuestionId: true } },
        appearances: { select: { roundId: true } },
        bookmarks: { select: { id: true, userId: true } },
      },
    }),
    db.question.findFirst({
      where: { id: intoId, unpublishedAt: null },
      select: {
        id: true,
        roundId: true,
        creditedUserIds: true,
        appearances: { select: { roundId: true } },
        bookmarks: { select: { userId: true } },
      },
    }),
  ]);
  const ctx = await context(fromId);
  const intoCtx = await context(intoId);
  if (!from || !into || !ctx || !intoCtx) {
    return { error: "Pick a published question to merge into." };
  }

  await db.$transaction(async (tx) => {
    for (const s of from.sources) {
      await tx.questionSource.upsert({
        where: {
          questionId_rawQuestionId: {
            questionId: into.id,
            rawQuestionId: s.rawQuestionId,
          },
        },
        create: { questionId: into.id, rawQuestionId: s.rawQuestionId },
        update: {},
      });
    }
    const rounds = new Set([
      from.roundId,
      ...from.appearances.map((a) => a.roundId),
    ]);
    rounds.delete(into.roundId);
    for (const roundId of rounds) {
      if (into.appearances.some((a) => a.roundId === roundId)) continue;
      await tx.questionAppearance.create({
        data: { questionId: into.id, roundId },
      });
    }
    const credits = [
      ...new Set([...into.creditedUserIds, ...from.creditedUserIds]),
    ];
    await tx.question.update({
      where: { id: into.id },
      data: { creditedUserIds: credits },
    });
    // Move bookmarks; a student who saved both keeps the one they had.
    const saved = new Set(into.bookmarks.map((b) => b.userId));
    for (const b of from.bookmarks) {
      if (saved.has(b.userId)) continue;
      await tx.bookmark.update({
        where: { id: b.id },
        data: { questionId: into.id },
      });
    }
    await tx.question.update({
      where: { id: from.id },
      data: { unpublishedAt: new Date() },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "merged",
        targetType: "question",
        targetId: from.id,
        driveId: ctx.round.drive.id,
        summary: label(ctx),
        detail: `Into "${intoCtx.title}" (${intoCtx.round.drive.year})`,
      },
      tx,
    );
  });
  updateTag("questions");
  refresh();
  return { error: null };
}
