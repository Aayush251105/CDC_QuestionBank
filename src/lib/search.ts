// Search page (07) helpers. Pure, so they are tested on their own.
import type {
  Difficulty,
  QuestionType,
  RoundType,
} from "@/generated/prisma/enums";

const TYPES = ["CODING", "MCQ", "APTITUDE", "SQL", "WRITTEN", "OTHER"] as const;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const ROUND_TYPES = ["OA", "TECHNICAL", "HR", "GD", "OTHER"] as const;
export const PAGE_SIZE = 20;

export type SearchSort = "best" | "newest" | "most";

export type SearchFilters = {
  q: string;
  types: QuestionType[];
  difficulties: Difficulty[];
  company?: string; // slug
  year?: number;
  round?: RoundType;
  topic?: string; // slug
  sort: SearchSort;
  page: number;
};

type Params = { [key: string]: string | string[] | undefined };

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((x) => x.trim()).filter(Boolean);
const one = (v: string | string[] | undefined) => list(v)[0];

// Reads /search?q=...&type=coding&type=mcq&difficulty=hard&company=amazon...
export function parseSearchFilters(params: Params): SearchFilters {
  const pick = <T extends string>(allowed: readonly T[], values: string[]) =>
    [...new Set(values.map((v) => v.toUpperCase()))].filter((v): v is T =>
      (allowed as readonly string[]).includes(v),
    );
  const year = Number(one(params.year));
  const round = one(params.round)?.toUpperCase();
  const sort = one(params.sort);
  const page = Number(one(params.page));
  return {
    q: (one(params.q) ?? "").slice(0, 200),
    types: pick(TYPES, list(params.type)),
    difficulties: pick(DIFFICULTIES, list(params.difficulty)),
    company: one(params.company)?.toLowerCase(),
    year:
      Number.isInteger(year) && year > 2000 && year < 2100 ? year : undefined,
    round: (ROUND_TYPES as readonly string[]).includes(round ?? "")
      ? (round as RoundType)
      : undefined,
    topic: one(params.topic)?.toLowerCase(),
    sort: sort === "newest" || sort === "most" ? sort : "best",
    page: Number.isInteger(page) && page > 1 && page <= 50 ? page : 1,
  };
}

// "Amazon 2025 sliding window" -> year 2025, rest "Amazon sliding window".
export function takeYear(text: string): { year?: number; rest: string } {
  const m = /\b(20\d{2})\b/.exec(text);
  if (!m) return { rest: text.trim() };
  return {
    year: Number(m[1]),
    rest: (text.slice(0, m.index) + text.slice(m.index + m[0].length))
      .replace(/\s+/g, " ")
      .trim(),
  };
}

// Postgres ts_headline marks hits with these two characters (set in the
// query); they never appear in normal text.
export const HIT_START = "\u0001";
export const HIT_END = "\u0002";

export type SnippetPart = { text: string; hit: boolean };

// Splits a ts_headline result into plain and highlighted parts. Markdown
// symbols are dropped so the snippet reads as plain text.
export function parseHeadline(headline: string): SnippetPart[] {
  const clean = headline
    .replace(/```[\w-]*|[`*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts: SnippetPart[] = [];
  const re = new RegExp(`${HIT_START}([^${HIT_END}]*)${HIT_END}`, "g");
  let last = 0;
  for (const m of clean.matchAll(re)) {
    if (m.index > last)
      parts.push({ text: clean.slice(last, m.index), hit: false });
    parts.push({ text: m[1], hit: true });
    last = m.index + m[0].length;
  }
  if (last < clean.length) parts.push({ text: clean.slice(last), hit: false });
  return parts;
}

// Builds a /search URL from filters, leaving out defaults.
export function searchHref(f: Partial<SearchFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const t of f.types ?? []) p.append("type", t.toLowerCase());
  for (const d of f.difficulties ?? []) p.append("difficulty", d.toLowerCase());
  if (f.company) p.set("company", f.company);
  if (f.year) p.set("year", String(f.year));
  if (f.round) p.set("round", f.round.toLowerCase());
  if (f.topic) p.set("topic", f.topic);
  if (f.sort && f.sort !== "best") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return qs ? `/search?${qs}` : "/search";
}

// Words that mean a question type: "amazon coding" -> type Coding.
// "SQL" is left as text because it is also a topic.
const TYPE_WORDS: Record<string, QuestionType> = {
  coding: "CODING",
  code: "CODING",
  mcq: "MCQ",
  mcqs: "MCQ",
  aptitude: "APTITUDE",
  written: "WRITTEN",
};

export function takeTypeWords(text: string): {
  types: QuestionType[];
  rest: string;
} {
  const types: QuestionType[] = [];
  const rest = text
    .split(/\s+/)
    .filter((word) => {
      const type = TYPE_WORDS[word.toLowerCase()];
      if (type && !types.includes(type)) types.push(type);
      return !type;
    })
    .join(" ")
    .trim();
  return { types, rest };
}
