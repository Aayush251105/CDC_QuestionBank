import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { visibleDrive } from "./visibility";

// One company with its visible drives, rounds, question counts and the
// most-asked topics per year. Null when the company is hidden, unverified
// or has nothing to show.
export async function getCompanyDetail(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const company = await db.company.findFirst({
    where: { slug, hidden: false, verified: true },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      drives: {
        where: visibleDrive,
        orderBy: [{ year: "desc" }, { sequence: "asc" }],
        select: {
          id: true,
          year: true,
          sequence: true,
          name: true,
          roles: true,
          ctcBand: true,
          eligibility: true,
          status: true,
          rounds: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              slug: true,
              name: true,
              date: true,
              format: true,
              platform: true,
              durationMin: true,
              roles: true,
              _count: { select: { questions: true } },
              questions: {
                select: {
                  tags: {
                    select: { tag: { select: { name: true, slug: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!company || company.drives.length === 0) return null;

  const years = [...new Set(company.drives.map((d) => d.year))];
  const topicsByYear = new Map<number, { name: string; slug: string }[]>();
  for (const year of years) {
    const counts = new Map<string, { name: string; slug: string; n: number }>();
    for (const d of company.drives.filter((x) => x.year === year)) {
      for (const r of d.rounds) {
        for (const q of r.questions) {
          for (const { tag } of q.tags) {
            const t = counts.get(tag.slug) ?? { ...tag, n: 0 };
            t.n += 1;
            counts.set(tag.slug, t);
          }
        }
      }
    }
    topicsByYear.set(
      year,
      [...counts.values()]
        .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
        .slice(0, 4)
        .map(({ name, slug }) => ({ name, slug })),
    );
  }

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    sector: company.sector,
    years,
    totalQuestions: company.drives
      .flatMap((d) => d.rounds)
      .reduce((n, r) => n + r._count.questions, 0),
    drives: company.drives.map((d) => ({
      ...d,
      rounds: d.rounds.map((r) => ({
        id: r.id,
        order: r.order,
        slug: r.slug,
        name: r.name,
        date: r.date,
        format: r.format,
        platform: r.platform,
        durationMin: r.durationMin,
        roles: r.roles,
        questions: r._count.questions,
      })),
    })),
    topicsByYear,
  };
}
