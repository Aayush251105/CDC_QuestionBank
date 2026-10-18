import "server-only";
import { notFound } from "next/navigation";
import { normaliseTitle } from "@/lib/review";
import { db } from "@/server/db";
import { pendingReview } from "./queries";

const matchedOn = {
  ROLL_NO: "matched on roll number",
  EMAIL: "matched on SNU email",
  NAME: "matched on name only",
  NONE: "",
} as const;

// A08: one submission with everything a reviewer needs beside it.
export async function getSubmissionReview(
  driveId: string,
  submissionId: string,
) {
  const sub = await db.submission.findFirst({
    where: { id: submissionId, round: { driveId, drive: { verified: true } } },
    select: {
      id: true,
      userId: true,
      status: true,
      mode: true,
      credit: true,
      enteredWithPin: true,
      pinUsed: true,
      verificationTag: true,
      submittedAt: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
          rollNo: true,
          programme: true,
          branch: true,
          gradYear: true,
        },
      },
      round: {
        select: {
          id: true,
          order: true,
          name: true,
          drive: { select: { companyId: true } },
        },
      },
      _count: { select: { scanPages: true } },
      rawQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          type: true,
          textOriginal: true,
          textCleaned: true,
          suggestedTags: true,
          suggestedDifficulty: true,
          decision: true,
          sources: { select: { question: { select: { title: true } } } },
        },
      },
    },
  });
  if (!sub) notFound();

  const [shortlist, otherSubs, queue, candidates, pendingTitles, tags] =
    await Promise.all([
      db.shortlistUpload.findFirst({
        where: { roundId: sub.round.id },
        orderBy: { createdAt: "desc" },
        select: {
          entries: {
            where: { matchedUserId: sub.userId },
            take: 1,
            select: { rowNo: true, match: true },
          },
        },
      }),
      db.submission.count({
        where: {
          userId: sub.userId,
          id: { not: sub.id },
          status: { not: "DRAFT" },
        },
      }),
      db.submission.findMany({
        where: { ...pendingReview, round: { driveId } },
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      }),
      // Questions this student's could be merged into: published questions
      // of the same company, this drive's first.
      db.question.findMany({
        where: {
          unpublishedAt: null,
          round: { drive: { companyId: sub.round.drive.companyId } },
        },
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          round: {
            select: {
              name: true,
              driveId: true,
              drive: { select: { year: true } },
            },
          },
        },
      }),
      db.rawQuestion.findMany({
        where: {
          submission: {
            ...pendingReview,
            id: { not: sub.id },
            round: { driveId },
          },
        },
        select: { title: true, textOriginal: true },
      }),
      db.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    ]);

  // Notes beside each question: sent by others, or already published.
  const othersByTitle = new Map<string, number>();
  for (const p of pendingTitles) {
    const key = normaliseTitle(p.title ?? p.textOriginal.slice(0, 80));
    othersByTitle.set(key, (othersByTitle.get(key) ?? 0) + 1);
  }
  const questions = sub.rawQuestions.map((q) => {
    const title = q.title ?? q.textOriginal.split("\n")[0].slice(0, 120);
    const key = normaliseTitle(title);
    const published = candidates.find((c) => normaliseTitle(c.title) === key);
    const others = othersByTitle.get(key) ?? 0;
    const note = published
      ? `Already published from ${published.round.name.toLowerCase()} (${published.round.drive.year})`
      : others > 0
        ? `Also sent by ${others} other ${others === 1 ? "student" : "students"}`
        : "";
    return { ...q, title, note, suggestedMerge: published?.id ?? null };
  });

  const entry = shortlist?.entries[0];
  const position = queue.findIndex((q) => q.id === sub.id);

  return {
    ...sub,
    questions,
    shortlistNote: !shortlist
      ? "No shortlist uploaded for this round yet"
      : entry
        ? `Row ${entry.rowNo} of the round ${sub.round.order} list, ${matchedOn[entry.match]}`
        : `Not on the round ${sub.round.order} list`,
    otherSubs,
    position: position >= 0 ? position + 1 : null,
    queueSize: queue.length,
    prevId: position > 0 ? queue[position - 1].id : null,
    nextId:
      position >= 0
        ? (queue[position + 1]?.id ?? null)
        : (queue[0]?.id ?? null),
    candidates: candidates
      .sort(
        (a, b) =>
          Number(b.round.driveId === driveId) -
          Number(a.round.driveId === driveId),
      )
      .map((c) => ({
        id: c.id,
        label: `${c.title} · ${c.round.drive.year} ${c.round.name}`,
      })),
    tags: tags.map((t) => t.name),
  };
}

export type SubmissionReview = Awaited<ReturnType<typeof getSubmissionReview>>;
