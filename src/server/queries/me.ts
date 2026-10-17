import "server-only";
import { db } from "@/server/db";
import { visibleDrive, visibleQuestion } from "./visibility";

// Per-student data, never cached across users.

// Saved questions and followed companies (page 11), newest first.
export async function getBookmarks(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [questions, companies] = await Promise.all([
    db.bookmark.findMany({
      where: { userId, question: visibleQuestion },
      orderBy: { createdAt: "desc" },
      select: {
        question: {
          select: {
            id: true,
            title: true,
            type: true,
            difficulty: true,
            round: {
              select: {
                name: true,
                type: true,
                drive: {
                  select: { year: true, company: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    db.bookmark.findMany({
      where: { userId, company: { hidden: false, verified: true } },
      orderBy: { createdAt: "desc" },
      select: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            sector: true,
            drives: {
              where: visibleDrive,
              select: {
                rounds: {
                  select: {
                    questions: { select: { publishedAt: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    questions: questions.flatMap((b) => (b.question ? [b.question] : [])),
    companies: companies.flatMap(({ company }) => {
      if (!company) return [];
      const published = company.drives.flatMap((d) =>
        d.rounds.flatMap((r) => r.questions.map((q) => q.publishedAt)),
      );
      return [
        {
          id: company.id,
          name: company.name,
          slug: company.slug,
          sector: company.sector,
          questions: published.length,
          newThisWeek: published.filter((p) => p >= weekAgo).length,
        },
      ];
    }),
  };
}

// The three numbers on the Profile page. Only states a student may see:
// never how many were published or rejected (CLAUDE.md 2a.2).
export async function getSubmissionCounts(userId: string) {
  const [shared, inReview, reviewed] = await Promise.all([
    db.submission.count({
      where: {
        userId,
        submittedAt: { not: null },
        status: { not: "WITHDRAWN" },
      },
    }),
    db.submission.count({ where: { userId, status: "PENDING_REVIEW" } }),
    db.submission.count({
      where: { userId, status: { in: ["PUBLISHED", "NOT_PUBLISHED"] } },
    }),
  ]);
  return { shared, inReview, reviewed };
}
