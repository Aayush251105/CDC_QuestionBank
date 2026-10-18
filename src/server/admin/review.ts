import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { driveTitle } from "@/lib/admin";
import {
  duplicateGroups,
  normaliseTitle,
  reviewNotes,
} from "@/lib/adminReview";
import { db } from "@/server/db";
import { logAction } from "./audit";
import { driveTitleSelect, pendingReview } from "./queries";

// ---------- Reading ----------

// A07: every waiting submission of one drive, with its checks and notes,
// and the duplicate groups across the drive.
export async function getReviewBatch(driveId: string) {
  const [submissions, published] = await Promise.all([
    db.submission.findMany({
      where: { ...pendingReview, driveId },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        submittedAt: true,
        createdAt: true,
        enteredWithPin: true,
        verificationTag: true,
        user: {
          select: { name: true, programme: true, branch: true, gradYear: true },
        },
        round: { select: { order: true, name: true } },
        rawQuestions: {
          orderBy: { order: "asc" },
          select: { title: true, textOriginal: true, textCleaned: true },
        },
      },
    }),
    db.question.findMany({
      where: { round: { driveId }, unpublishedAt: null },
      select: { title: true, round: { select: { name: true } } },
    }),
  ]);

  const items = [
    ...submissions.flatMap((s) =>
      s.rawQuestions.map((q) => ({
        title: q.title ?? q.textOriginal.slice(0, 80),
        roundName: s.round?.name ?? "",
        submissionId: s.id as string | null,
      })),
    ),
    ...published.map((q) => ({
      title: q.title,
      roundName: q.round.name,
      submissionId: null,
    })),
  ];
  const groups = duplicateGroups(items);
  const groupSize = new Map(
    groups.map((g) => [g.key, g.senders + g.published]),
  );

  const rows = submissions.map((s) => {
    const titles = s.rawQuestions.map((q) =>
      normaliseTitle(q.title ?? q.textOriginal.slice(0, 80)),
    );
    const duplicates = Math.max(
      0,
      ...titles.map((t) => (groupSize.get(t) ?? 1) - 1),
    );
    const unclear = s.rawQuestions.reduce(
      (n, q) =>
        n +
        ((q.textCleaned ?? q.textOriginal).match(/\[unclear\]/gi)?.length ?? 0),
      0,
    );
    return {
      id: s.id,
      name: s.user.name,
      meta: [s.user.programme, s.user.branch, s.user.gradYear]
        .filter(Boolean)
        .join(" "),
      round: s.round?.name ?? "",
      questions: s.rawQuestions.length,
      viaPin: s.enteredWithPin,
      tag: s.verificationTag,
      notes: reviewNotes({
        tag: s.verificationTag,
        roundOrder: s.round?.order ?? 0,
        duplicates,
        unclear,
      }),
      sent: s.submittedAt ?? s.createdAt,
      // Approve all verified skips anything a reviewer should merge by hand.
      bulkApprovable: s.verificationTag === "VERIFIED" && duplicates === 0,
    };
  });

  return { rows, groups };
}

// Drives with something waiting, for the "Switch drive" menu and the
// sidebar's Review queue (oldest waiting first).
export async function drivesWithPending() {
  const pending = await db.submission.findMany({
    where: pendingReview,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    select: { drive: { select: driveTitleSelect } },
  });
  const drives = new Map<string, { id: string; title: string; n: number }>();
  for (const p of pending) {
    const d = p.drive;
    const entry = drives.get(d.id) ?? { id: d.id, title: driveTitle(d), n: 0 };
    entry.n++;
    drives.set(d.id, entry);
  }
  return [...drives.values()];
}

// ---------- Deciding ----------

export type Decision = {
  rawId: string;
  decision: "APPROVE" | "MERGE" | "REJECT";
  mergeInto?: string; // question id, for MERGE
  reason?: string; // for REJECT, CDC only
  // Reviewer's edits, for APPROVE
  title?: string;
  text?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  topics?: string[];
};

// Applies the reviewer's decision for every question of one submission
// (A08 "Save", A07 "Approve all verified"). Approve publishes a new
// question, Merge adds the student as a source of an existing one, Reject
// keeps the reason inside the CDC. The submission then becomes Published if
// anything was kept, else Not published; the student only sees "Reviewed"
// (CLAUDE.md 2a.2). Raw questions are never deleted.
export async function applyDecisions(
  tx: Prisma.TransactionClient,
  adminId: string,
  submissionId: string,
  decisions: Decision[],
) {
  const sub = await tx.submission.findUniqueOrThrow({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      credit: true,
      roundId: true,
      reviewStartedAt: true,
      drive: { select: driveTitleSelect },
      rawQuestions: {
        select: {
          id: true,
          title: true,
          type: true,
          textOriginal: true,
          textCleaned: true,
          options: true,
          suggestedTags: true,
          suggestedDifficulty: true,
        },
      },
    },
  });
  // Questions are published under the submission's round.
  const roundId = sub.roundId;
  if (!roundId) throw new Error("This submission has no round yet");
  const drive = sub.drive;
  const tags = await tx.tag.findMany({ select: { id: true, name: true } });
  const tagIds = (names: string[]) => [
    ...new Set(
      names.flatMap((n) => {
        const t = tags.find(
          (x) => x.name.toLowerCase() === n.trim().toLowerCase(),
        );
        return t ? [t.id] : [];
      }),
    ),
  ];

  let kept = 0;
  for (const d of decisions) {
    const raw = sub.rawQuestions.find((r) => r.id === d.rawId);
    if (!raw) continue;
    const title = (d.title ?? raw.title ?? raw.textOriginal.split("\n")[0])
      .trim()
      .slice(0, 200);
    const summary = `${driveTitle(drive)} · ${title}`;

    if (d.decision === "APPROVE") {
      const last = await tx.question.aggregate({
        where: { roundId },
        _max: { order: true },
      });
      const question = await tx.question.create({
        data: {
          roundId,
          order: (last._max.order ?? 0) + 1,
          title,
          bodyMarkdown: (d.text ?? raw.textCleaned ?? raw.textOriginal).trim(),
          type: d.type ?? raw.type,
          options: raw.options ?? undefined,
          difficulty: d.difficulty ?? raw.suggestedDifficulty ?? "MEDIUM",
          creditedUserIds: sub.credit ? [sub.userId] : [],
          tags: {
            create: tagIds(d.topics ?? raw.suggestedTags).map((tagId) => ({
              tagId,
            })),
          },
          sources: { create: { rawQuestionId: raw.id } },
        },
      });
      await tx.rawQuestion.update({
        where: { id: raw.id },
        data: { decision: "APPROVED" },
      });
      await logAction(
        {
          adminId,
          action: "approved",
          targetType: "rawQuestion",
          targetId: raw.id,
          driveId: drive.id,
          summary,
          detail: `Published as question ${question.id}`,
        },
        tx,
      );
      kept++;
    } else if (d.decision === "MERGE" && d.mergeInto) {
      const target = await tx.question.findUnique({
        where: { id: d.mergeInto },
        select: { id: true, title: true, roundId: true, creditedUserIds: true },
      });
      if (!target) continue;
      await tx.questionSource.upsert({
        where: {
          questionId_rawQuestionId: {
            questionId: target.id,
            rawQuestionId: raw.id,
          },
        },
        create: { questionId: target.id, rawQuestionId: raw.id },
        update: {},
      });
      if (sub.credit && !target.creditedUserIds.includes(sub.userId)) {
        await tx.question.update({
          where: { id: target.id },
          data: { creditedUserIds: { push: sub.userId } },
        });
      }
      // Asked again in another round: list it there too ("Where it was asked").
      if (target.roundId !== roundId) {
        await tx.questionAppearance.upsert({
          where: {
            questionId_roundId: { questionId: target.id, roundId },
          },
          create: { questionId: target.id, roundId },
          update: {},
        });
      }
      await tx.rawQuestion.update({
        where: { id: raw.id },
        data: { decision: "MERGED" },
      });
      await logAction(
        {
          adminId,
          action: "merged",
          targetType: "rawQuestion",
          targetId: raw.id,
          driveId: drive.id,
          summary,
          detail: `Into "${target.title}"`,
        },
        tx,
      );
      kept++;
    } else if (d.decision === "REJECT") {
      await tx.rawQuestion.update({
        where: { id: raw.id },
        data: { decision: "REJECTED" },
      });
      await logAction(
        {
          adminId,
          action: "rejected",
          targetType: "rawQuestion",
          targetId: raw.id,
          driveId: drive.id,
          summary,
          reason: d.reason || "Other",
          detail: `Reason: ${d.reason || "Other"}`,
        },
        tx,
      );
    }
  }

  const now = new Date();
  await tx.submission.update({
    where: { id: sub.id },
    data: {
      status: kept > 0 ? "PUBLISHED" : "NOT_PUBLISHED",
      reviewStartedAt: sub.reviewStartedAt ?? now,
      reviewedAt: now,
    },
  });
  return kept;
}
