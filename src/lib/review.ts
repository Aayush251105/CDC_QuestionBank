// S4 "Check the cleaned-up version" helpers. Pure, so they are tested; the
// server actions run every edit through them (never trust the browser).
import type {
  Difficulty,
  QuestionType,
  SubmissionStatus,
} from "@/generated/prisma/enums";
import { MAX_QUESTIONS } from "./aiQuestions";

const TYPES: QuestionType[] = [
  "CODING",
  "MCQ",
  "APTITUDE",
  "SQL",
  "WRITTEN",
  "OTHER",
];
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const MAX_TEXT = 8000;
const MAX_OPTIONS = 6;
const MAX_TOPICS = 5;

// One question as the review page edits it. Options and topics are plain
// text in the form ("one option per line", "Graphs, BFS").
export type ReviewQuestion = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  cleaned: string;
  options: string;
  topics: string;
};

export type CleanReviewQuestion = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  cleaned: string;
  options: { key: string; text: string }[];
  topics: string[];
};

// Students may change a submission while it is a draft, or after sending it
// until the CDC starts the review (CLAUDE.md section 6).
export function studentCanEdit(s: {
  status: SubmissionStatus;
  reviewStartedAt: Date | null;
}) {
  return (
    s.status === "DRAFT" ||
    (s.status === "PENDING_REVIEW" && s.reviewStartedAt === null)
  );
}

// "A. Escalate" / "b) talk" / "(c) wait" / "wait": one option per line,
// keys given again as A, B, C in order.
export function parseOptions(text: string): { key: string; text: string }[] {
  return text
    .split("\n")
    .map((l) =>
      l
        .trim()
        .replace(/^\(?[a-fA-F][).:]\s+/, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, MAX_OPTIONS)
    .map((t, i) => ({
      key: String.fromCharCode(65 + i),
      text: t.slice(0, 300),
    }));
}

export function optionsText(options: unknown): string {
  return Array.isArray(options)
    ? options
        .map((o) => (o as { key?: string; text?: string }) ?? {})
        .filter((o) => o.text)
        .map((o) => `${o.key ?? "?"}. ${o.text}`)
        .join("\n")
    : "";
}

export function parseTopics(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const t = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out.slice(0, MAX_TOPICS);
}

// How many [unclear] markers are left for the student to fill in.
export function countUnclear(text: string): number {
  return text.match(/\[unclear\]/gi)?.length ?? 0;
}

// Checks what the page sent. Unknown ids are dropped by the caller (it only
// updates the student's own questions).
export function parseReviewQuestions(raw: unknown): CleanReviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return raw.slice(0, MAX_QUESTIONS).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const q = item as Record<string, unknown>;
    const id = str(q.id);
    if (!id) return [];
    return [
      {
        id,
        type: TYPES.includes(q.type as QuestionType)
          ? (q.type as QuestionType)
          : "CODING",
        difficulty: DIFFICULTIES.includes(q.difficulty as Difficulty)
          ? (q.difficulty as Difficulty)
          : "MEDIUM",
        cleaned: str(q.cleaned).trim().slice(0, MAX_TEXT),
        options: parseOptions(str(q.options)),
        topics: parseTopics(str(q.topics)),
      },
    ];
  });
}

// "SUB-2025-7KQ2XM": a short reference shown on S5 and S6, taken from the
// submission id so it needs no extra column.
export function submissionRef(id: string, year: number): string {
  return `SUB-${year}-${id.slice(-6).toUpperCase()}`;
}
