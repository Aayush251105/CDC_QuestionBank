import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { QuestionType } from "@/generated/prisma/enums";
import {
  HIT_END,
  HIT_START,
  PAGE_SIZE,
  type SearchFilters,
  takeTypeWords,
  takeYear,
} from "@/lib/search";
import { db } from "@/server/db";
import { visibleDrive, visibleQuestion } from "./visibility";

const roundRef = {
  slug: true,
  name: true,
  type: true,
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

// Postgres full-text search over visible questions, plus topic names.
// "Amazon 2025 sliding window" is read as company Amazon, year 2025 and the
// words "sliding window". Returns one page of results and the type counts.
export async function searchQuestions(f: SearchFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  // 1. Pull a year and a company name out of the free text.
  let { year, rest } = takeYear(f.q);
  year = f.year ?? year;
  let company = f.company;
  if (rest) {
    const companies = await db.company.findMany({
      where: { hidden: false, verified: true },
      select: { slug: true, name: true, aliases: true },
    });
    const lower = ` ${rest.toLowerCase()} `;
    const match = companies
      .flatMap((c) =>
        [c.name, ...c.aliases].map((n) => ({ c, n: n.toLowerCase() })),
      )
      .sort((a, b) => b.n.length - a.n.length)
      .find(({ n }) => lower.includes(` ${n} `));
    if (match) {
      company ??= match.c.slug;
      rest = lower.replace(` ${match.n} `, " ").trim();
    }
  }

  // Type words ("coding", "mcq") become a type filter unless one is set.
  const typeWords = takeTypeWords(rest);
  rest = typeWords.rest;
  const types = f.types.length ? f.types : typeWords.types;

  // 2. Words left over: full-text match on title and body, or a topic name.
  const hits = new Map<string, { rank: number; headline: string | null }>();
  let anyWord = false;
  if (rest) {
    // All words first; if nothing matches, any of the words.
    const fullText = (terms: string) => db.$queryRaw<
      { id: string; rank: number; headline: string }[]
    >`
      SELECT q.id,
             ts_rank(q."searchVector", query) AS rank,
             ts_headline('english', q."bodyMarkdown", query,
               ${`StartSel=${HIT_START}, StopSel=${HIT_END}, MaxWords=22, MinWords=8, MaxFragments=1`}) AS headline
      FROM "Question" q, websearch_to_tsquery('english', ${terms}) AS query
      WHERE q."searchVector" @@ query`;
    const words = rest.split(/\s+/).filter((w) => /^[\p{L}\p{N}]+$/u.test(w));
    // Topic names: the whole text ("sliding window"), or in the fallback
    // any single word that is a topic ("SQL" in "SQL joins").
    const byTopic = (anyOfWords: boolean) =>
      db.question.findMany({
        where: {
          tags: {
            some: {
              tag: {
                OR: [
                  { name: { contains: rest, mode: "insensitive" } },
                  ...(anyOfWords
                    ? words.map((w) => ({
                        name: { equals: w, mode: "insensitive" as const },
                      }))
                    : []),
                ],
              },
            },
          },
        },
        select: { id: true },
      });

    let rows = await fullText(rest);
    let topicRows = await byTopic(false);
    if (rows.length === 0 && topicRows.length === 0 && words.length > 1) {
      rows = await fullText(words.join(" or "));
      topicRows = await byTopic(true);
      anyWord = rows.length + topicRows.length > 0;
    }
    for (const r of rows)
      hits.set(r.id, { rank: Number(r.rank), headline: r.headline });
    for (const { id } of topicRows) {
      if (!hits.has(id)) hits.set(id, { rank: 0.05, headline: null });
    }
  }

  // 3. Filters (all but type, so the type counts stay useful).
  const where: Prisma.QuestionWhereInput = {
    AND: [
      visibleQuestion,
      rest ? { id: { in: [...hits.keys()] } } : {},
      f.difficulties.length ? { difficulty: { in: f.difficulties } } : {},
      f.topic ? { tags: { some: { tag: { slug: f.topic } } } } : {},
      company || year || f.round
        ? {
            round: {
              ...(f.round ? { type: f.round } : {}),
              drive: {
                ...visibleDrive,
                ...(year ? { year } : {}),
                ...(company
                  ? {
                      company: { slug: company, hidden: false, verified: true },
                    }
                  : {}),
              },
            },
          }
        : {},
    ],
  };

  const all = await db.question.findMany({
    where,
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      type: true,
      difficulty: true,
      publishedAt: true,
      round: { select: roundRef },
      appearances: { select: { round: { select: roundRef } } },
    },
  });

  const typeCounts = new Map<QuestionType, number>();
  for (const q of all)
    typeCounts.set(q.type, (typeCounts.get(q.type) ?? 0) + 1);

  const filtered = types.length
    ? all.filter((q) => types.includes(q.type))
    : all;
  const timesAsked = (q: (typeof all)[number]) => 1 + q.appearances.length;
  const sorted = filtered.sort((a, b) => {
    if (f.sort === "newest")
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    if (f.sort === "most")
      return timesAsked(b) - timesAsked(a) || a.title.localeCompare(b.title);
    return (
      (hits.get(b.id)?.rank ?? 0) - (hits.get(a.id)?.rank ?? 0) ||
      b.publishedAt.getTime() - a.publishedAt.getTime() ||
      a.title.localeCompare(b.title)
    );
  });

  return {
    total: sorted.length,
    typeCounts: Object.fromEntries(typeCounts) as Partial<
      Record<QuestionType, number>
    >,
    understood: { year, company, types: f.types.length ? [] : types, anyWord },
    results: sorted.slice(0, PAGE_SIZE * f.page).map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      difficulty: q.difficulty,
      headline: hits.get(q.id)?.headline ?? null,
      body: q.bodyMarkdown,
      askedIn: [q.round, ...q.appearances.map((a) => a.round)].filter(
        (r) =>
          r.drive.verified &&
          !r.drive.company.hidden &&
          r.drive.company.verified,
      ),
    })),
  };
}

// Choices for the filter column.
export async function getSearchOptions() {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const [companies, drives, tags] = await Promise.all([
    db.company.findMany({
      where: { hidden: false, verified: true, drives: { some: visibleDrive } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    db.drive.findMany({
      where: visibleDrive,
      select: { year: true },
      distinct: ["year"],
    }),
    db.tag.findMany({
      orderBy: [{ groupOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
  ]);
  return {
    companies,
    years: drives.map((d) => d.year).sort((a, b) => b - a),
    topics: tags,
  };
}
