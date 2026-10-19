import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { driveLabel } from "@/lib/drives";
import { liveQuestion, visibleDrive, visibleQuestion } from "./visibility";

// Shared questions change only when the CDC publishes, so these are cached
// for a few minutes. Tagged so the admin side can refresh them on publish.

export async function getRecentQuestions(limit = 6) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  return db.question.findMany({
    where: visibleQuestion,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      difficulty: true,
      round: {
        select: {
          name: true,
          drive: {
            select: { year: true, company: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function getTopTopics(limit = 8) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const tags = await db.tag.findMany({
    select: {
      name: true,
      slug: true,
      _count: {
        select: { questions: { where: { question: visibleQuestion } } },
      },
    },
  });
  return tags
    .map((t) => ({ name: t.name, slug: t.slug, count: t._count.questions }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Drives currently taking submissions (replaces "Visiting campus this month").
export async function getOpenDrives(limit = 4) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const drives = await db.drive.findMany({
    where: { ...visibleDrive, status: "OPEN" },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      companyId: true,
      year: true,
      sequence: true,
      roles: true,
      company: { select: { name: true, slug: true } },
      rounds: {
        where: { verified: true },
        select: { _count: { select: { questions: { where: liveQuestion } } } },
      },
    },
  });
  // Visits per company and year, so a second visit shows as "2025 · B".
  const visits = await db.drive.groupBy({
    by: ["companyId", "year"],
    where: {
      ...visibleDrive,
      companyId: { in: drives.map((d) => d.companyId) },
    },
    _count: true,
  });
  const visitCount = (companyId: string, year: number) =>
    visits.find((v) => v.companyId === companyId && v.year === year)?._count ??
    1;

  return drives.map((d) => ({
    id: d.id,
    year: d.year,
    label: driveLabel(d.year, d.sequence, visitCount(d.companyId, d.year)),
    roles: d.roles,
    company: d.company,
    questions: d.rounds.reduce((n, r) => n + r._count.questions, 0),
  }));
}

// Companies the student follows, with questions published in the last 7 days.
export async function getFollowedCompanies(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const bookmarks = await db.bookmark.findMany({
    where: { userId, company: { hidden: false, verified: true } },
    orderBy: { createdAt: "asc" },
    select: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          drives: {
            where: visibleDrive,
            select: {
              rounds: {
                where: { verified: true },
                select: {
                  _count: {
                    select: {
                      questions: {
                        where: {
                          ...liveQuestion,
                          publishedAt: { gte: weekAgo },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return bookmarks.flatMap(({ company }) =>
    company
      ? [
          {
            id: company.id,
            name: company.name,
            slug: company.slug,
            fresh: company.drives
              .flatMap((d) => d.rounds)
              .reduce((n, r) => n + r._count.questions, 0),
          },
        ]
      : [],
  );
}
