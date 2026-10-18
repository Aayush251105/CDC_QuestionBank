import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { QuestionType } from "@/generated/prisma/enums";
import { db } from "@/server/db";

export const PAGE_SIZE = 50;

const TYPES: QuestionType[] = ["MCQ", "CODING", "APTITUDE", "SQL", "WRITTEN"];

export type QuestionFilters = {
  q: string;
  company: string; // slug
  year: number | null;
  type: QuestionType | null;
  topic: string; // tag slug
  show: "live" | "unpublished";
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export function parseQuestionFilters(params: Params): QuestionFilters {
  const type = one(params.type).toUpperCase() as QuestionType;
  return {
    q: one(params.q).trim(),
    company: one(params.company),
    year: Number(one(params.year)) || null,
    type: TYPES.includes(type) ? type : null,
    topic: one(params.topic),
    show: one(params.show) === "unpublished" ? "unpublished" : "live",
    page: Math.max(1, Number(one(params.page)) || 1),
  };
}

export function questionWhere(f: QuestionFilters): Prisma.QuestionWhereInput {
  return {
    unpublishedAt: f.show === "live" ? null : { not: null },
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { bodyMarkdown: { contains: f.q, mode: "insensitive" } },
      ],
    }),
    ...(f.type && { type: f.type }),
    ...(f.topic && { tags: { some: { tag: { slug: f.topic } } } }),
    round: {
      drive: {
        ...(f.year && { year: f.year }),
        ...(f.company && { company: { slug: f.company } }),
      },
    },
  };
}

export const questionRowSelect = {
  id: true,
  title: true,
  bodyMarkdown: true,
  type: true,
  difficulty: true,
  publishedAt: true,
  unpublishedAt: true,
  round: {
    select: {
      name: true,
      drive: {
        select: {
          id: true,
          year: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  },
  tags: { select: { tag: { select: { name: true } } } },
  _count: { select: { sources: true } },
} satisfies Prisma.QuestionSelect;

// A09: the filtered list, one page at a time, plus the filter options.
export async function getQuestionList(f: QuestionFilters) {
  const where = questionWhere(f);
  const [total, rows, companies, years, topics] = await Promise.all([
    db.question.count({ where }),
    db.question.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: questionRowSelect,
    }),
    db.company.findMany({
      where: {
        drives: { some: { rounds: { some: { questions: { some: {} } } } } },
      },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    db.drive.findMany({
      where: { rounds: { some: { questions: { some: {} } } } },
      distinct: ["year"],
      orderBy: { year: "desc" },
      select: { year: true },
    }),
    db.tag.findMany({
      orderBy: [{ groupOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
    }),
  ]);
  return { total, rows, companies, years: years.map((y) => y.year), topics };
}

// The edit panel: the question in full, topic names and questions of the
// same company it could be merged into.
export async function getQuestionForEdit(id: string) {
  const q = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      type: true,
      difficulty: true,
      unpublishedAt: true,
      tags: { select: { tag: { select: { name: true } } } },
      round: { select: { drive: { select: { companyId: true } } } },
    },
  });
  if (!q) return null;
  const [tags, candidates] = await Promise.all([
    db.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    db.question.findMany({
      where: {
        id: { not: id },
        unpublishedAt: null,
        round: { drive: { companyId: q.round.drive.companyId } },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        round: { select: { name: true, drive: { select: { year: true } } } },
      },
    }),
  ]);
  return {
    ...q,
    topics: q.tags.map((t) => t.tag.name),
    tagNames: tags.map((t) => t.name),
    candidates: candidates.map((c) => ({
      id: c.id,
      label: `${c.title} · ${c.round.drive.year} ${c.round.name}`,
    })),
  };
}
