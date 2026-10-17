import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { visibleQuestion } from "./visibility";

const roundRef = {
  slug: true,
  name: true,
  drive: {
    select: {
      year: true,
      sequence: true,
      verified: true,
      company: {
        select: { name: true, slug: true, hidden: true, verified: true },
      },
    },
  },
} as const;

// One published question, where it was asked, its neighbours in the round,
// similar questions (most shared topics) and who chose to be credited.
export async function getQuestionDetail(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const q = await db.question.findFirst({
    where: { id, ...visibleQuestion },
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      type: true,
      difficulty: true,
      options: true,
      notes: true,
      order: true,
      roundId: true,
      creditedUserIds: true,
      tags: {
        select: { tag: { select: { id: true, name: true, slug: true } } },
      },
      round: { select: roundRef },
      appearances: { select: { round: { select: roundRef } } },
    },
  });
  if (!q) return null;

  const tagIds = q.tags.map((t) => t.tag.id);
  const [inRound, candidates, credited] = await Promise.all([
    db.question.findMany({
      where: { roundId: q.roundId },
      orderBy: [{ order: "asc" }, { publishedAt: "asc" }],
      select: { id: true, title: true },
    }),
    tagIds.length
      ? db.question.findMany({
          where: {
            ...visibleQuestion,
            id: { not: q.id },
            tags: { some: { tagId: { in: tagIds } } },
          },
          select: {
            id: true,
            title: true,
            type: true,
            difficulty: true,
            tags: { select: { tagId: true } },
            round: { select: roundRef },
          },
        })
      : [],
    // Only students who opted in to credit; names only, never emails.
    q.creditedUserIds.length
      ? db.user.findMany({
          where: { id: { in: q.creditedUserIds } },
          select: { name: true },
        })
      : [],
  ]);

  const position = inRound.findIndex((x) => x.id === q.id);
  const shared = (c: (typeof candidates)[number]) =>
    c.tags.filter((t) => tagIds.includes(t.tagId)).length;

  return {
    id: q.id,
    title: q.title,
    bodyMarkdown: q.bodyMarkdown,
    type: q.type,
    difficulty: q.difficulty,
    notes: q.notes,
    options: Array.isArray(q.options)
      ? (q.options as { key: string; text: string }[])
      : [],
    tags: q.tags.map(({ tag }) => ({ name: tag.name, slug: tag.slug })),
    round: q.round,
    number: position + 1,
    roundCount: inRound.length,
    next: inRound[position + 1] ?? null,
    previous: position > 0 ? inRound[position - 1] : null,
    // The round it is listed under first, then every other round it came up in.
    askedIn: [q.round, ...q.appearances.map((a) => a.round)].filter(
      (r) =>
        r.drive.verified && !r.drive.company.hidden && r.drive.company.verified,
    ),
    similar: candidates
      .sort(
        (a, b) =>
          shared(b) - shared(a) ||
          Number(b.type === q.type) - Number(a.type === q.type) ||
          a.title.localeCompare(b.title),
      )
      .slice(0, 3),
    creditedNames: credited.map((u) => u.name),
  };
}
