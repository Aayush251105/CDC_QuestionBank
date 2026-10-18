import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parseDriveSegment } from "@/lib/drives";
import { db } from "@/server/db";
import { visibleDrive, visibleQuestion } from "./visibility";

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

// One round of a visible drive with its published questions. Questions also
// asked in other rounds show up here too ("Where it was asked").
// Null when anything in the path is hidden, unverified or missing.
export async function getRoundDetail(
  companySlug: string,
  driveSegment: string,
  roundSlug: string,
) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const visit = parseDriveSegment(driveSegment);
  if (!visit) return null;

  const round = await db.round.findFirst({
    where: {
      slug: roundSlug,
      verified: true,
      drive: {
        ...visibleDrive,
        year: visit.year,
        sequence: visit.sequence,
        company: { slug: companySlug, hidden: false, verified: true },
      },
    },
    select: {
      id: true,
      name: true,
      date: true,
      format: true,
      platform: true,
      durationMin: true,
      roles: true,
      drive: {
        select: {
          year: true,
          sequence: true,
          roles: true,
          companyId: true,
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!round) return null;

  const [questions, sharedBy, visitsThatYear] = await Promise.all([
    db.question.findMany({
      where: {
        ...visibleQuestion,
        OR: [
          { roundId: round.id },
          { appearances: { some: { roundId: round.id } } },
        ],
      },
      orderBy: [{ order: "asc" }, { publishedAt: "asc" }],
      select: {
        id: true,
        roundId: true,
        title: true,
        bodyMarkdown: true,
        type: true,
        difficulty: true,
        options: true,
        tags: { select: { tag: { select: { name: true, slug: true } } } },
        round: { select: roundRef },
        appearances: { select: { round: { select: roundRef } } },
      },
    }),
    // Students who sent this round in (a count only, never who).
    db.submission.count({
      where: {
        roundId: round.id,
        submittedAt: { not: null },
        status: { not: "WITHDRAWN" },
      },
    }),
    db.drive.count({
      where: {
        ...visibleDrive,
        companyId: round.drive.companyId,
        year: round.drive.year,
      },
    }),
  ]);

  return {
    ...round,
    sharedBy,
    visitsThatYear,
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      bodyMarkdown: q.bodyMarkdown,
      type: q.type,
      difficulty: q.difficulty,
      options: Array.isArray(q.options)
        ? (q.options as { key: string; text: string }[])
        : [],
      tags: q.tags.map((t) => t.tag),
      // Every other round this question came up in.
      alsoAsked: [q.round, ...q.appearances.map((a) => a.round)].filter(
        (r) =>
          r.drive.verified &&
          !r.drive.company.hidden &&
          r.drive.company.verified &&
          !(
            r.slug === roundSlug &&
            r.drive.company.slug === companySlug &&
            r.drive.year === visit.year &&
            r.drive.sequence === visit.sequence
          ),
      ),
    })),
  };
}
