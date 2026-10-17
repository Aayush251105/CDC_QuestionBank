// The shape the AI must return when it turns a student's notes into
// questions (CLAUDE.md 2a.9), how we check what it sent, and a no-AI
// fallback used when GROQ_API_KEY is not set. Pure, so it is tested.
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";

export const MAX_QUESTIONS = 40;
const TYPES: QuestionType[] = ["CODING", "MCQ", "APTITUDE", "SQL", "WRITTEN"];
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export type AiQuestion = {
  type: QuestionType;
  title: string;
  original: string; // the student's words for this question, unchanged
  cleaned: string; // tidied markdown: grammar and layout only
  options: { key: string; text: string }[];
  answer: string; // only if the student wrote one
  aiAdded: string[]; // parts the AI wrote itself ("Constraints", "Example")
  topics: string[]; // from our topic list
  difficulty: Difficulty;
  photo: number | null; // which photo it was read from; null if typed
};

// JSON schema for Groq's strict structured output: every property required,
// nothing extra. Topics are limited to the names in our Tag table.
export function questionsSchema(topicNames: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "type",
            "title",
            "original",
            "cleaned",
            "options",
            "answer",
            "aiAdded",
            "topics",
            "difficulty",
          ],
          properties: {
            type: { type: "string", enum: TYPES },
            title: { type: "string" },
            original: { type: "string" },
            cleaned: { type: "string" },
            options: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["key", "text"],
                properties: {
                  key: { type: "string" },
                  text: { type: "string" },
                },
              },
            },
            answer: { type: "string" },
            aiAdded: { type: "array", items: { type: "string" } },
            topics: {
              type: "array",
              items: { type: "string", enum: topicNames },
            },
            difficulty: { type: "string", enum: DIFFICULTIES },
          },
        },
      },
    },
  } as const;
}

// Checks and caps whatever came back, so a bad model reply can never put
// junk in the database.
export function normaliseAiQuestions(
  raw: unknown,
  topicNames: string[],
): AiQuestion[] {
  const list = (raw as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const out: AiQuestion[] = [];
  for (const item of list.slice(0, MAX_QUESTIONS)) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const original = str(q.original, 8000);
    const rawCleaned = str(q.cleaned, 8000) || original;
    if (!rawCleaned) continue;
    const options = Array.isArray(q.options)
      ? q.options
          .map((o, i) => ({
            key:
              str((o as { key?: unknown })?.key, 2).toUpperCase() ||
              String.fromCharCode(65 + i),
            text: str((o as { text?: unknown })?.text, 300),
          }))
          .filter((o) => o.text)
          .slice(0, 6)
      : [];
    // Options are shown from `options`; drop them if the model repeated
    // them in the text.
    const cleaned = options.length
      ? withoutOptionLines(rawCleaned)
      : rawCleaned;
    out.push({
      type: TYPES.includes(q.type as QuestionType)
        ? (q.type as QuestionType)
        : "CODING",
      title: str(q.title, 120) || firstLine(cleaned),
      original: original || cleaned,
      cleaned,
      options,
      answer: str(q.answer, 300),
      aiAdded: Array.isArray(q.aiAdded)
        ? [
            ...new Set(
              q.aiAdded.map((a) => str(a, 40)).filter((a) => a.length > 0),
            ),
          ].slice(0, 8)
        : [],
      topics: Array.isArray(q.topics)
        ? [
            ...new Set(
              q.topics.filter((t): t is string =>
                topicNames.includes(t as string),
              ),
            ),
          ].slice(0, 3)
        : [],
      difficulty: DIFFICULTIES.includes(q.difficulty as Difficulty)
        ? (q.difficulty as Difficulty)
        : "MEDIUM",
      // Set by the caller, which knows which photo it sent (never the model).
      photo: null,
    });
  }
  return out;
}

// Removes "Options: a) .. b) .." lines and lines that are only a list of
// lettered choices.
export function withoutOptionLines(text: string): string {
  return text
    .split("\n")
    .filter(
      (l) =>
        !/^\s*\**\s*(answer\s+)?options?\s*\**\s*:/i.test(l) &&
        !/^\s*[-*]?\s*\(?[a-fA-F][).]\s+\S.*\s\(?[b-fB-F][).]\s+\S/.test(l),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstLine(text: string) {
  const line =
    text
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? "Question";
  return line.length > 80 ? `${line.slice(0, 77).trimEnd()}…` : line;
}

// ---------- No-AI fallback (no GROQ_API_KEY) ----------

const OPTION_LINE = /^\s*\(?([a-fA-F])[).:]\s+(.+)$/;
const QUESTION_START = /^\s*(?:q(?:uestion)?\s*\d+|\d+\s*[).:])\s*[-:.)]?\s*/i;

// Splits notes into questions on blank lines or "Q1", "1." starts, and makes
// a rough guess at the type. Text is kept as written (no cleanup).
export function splitWithoutAi(text: string): AiQuestion[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const startsNew =
      QUESTION_START.test(line) && current.some((l) => l.trim());
    if (!line.trim() || startsNew) {
      if (current.some((l) => l.trim())) blocks.push(current.join("\n").trim());
      current = line.trim() ? [line] : [];
    } else {
      current.push(line);
    }
  }
  if (current.some((l) => l.trim())) blocks.push(current.join("\n").trim());

  return blocks.slice(0, MAX_QUESTIONS).map((block) => {
    const lines = block.split("\n");
    // Options one per line ("a) escalate"), or several on one line
    // ("a) O(n) b) O(n log n) c) O(1)").
    const options = lines
      .filter((l) => OPTION_LINE.test(l))
      .flatMap((l) =>
        l
          .split(/\s+(?=\(?[a-fA-F][).:]\s)/)
          .map((part) => OPTION_LINE.exec(part))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => ({ key: m[1].toUpperCase(), text: m[2].trim() })),
      );
    const lower = block.toLowerCase();
    const type: QuestionType =
      options.length >= 2
        ? "MCQ"
        : /\b(select|table|query|sql|join)\b/.test(lower)
          ? "SQL"
          : /\b(essay|write about|words)\b/.test(lower)
            ? "WRITTEN"
            : /\b(train|pipe|ratio|percent|profit|speed|probability|age)\b/.test(
                  lower,
                )
              ? "APTITUDE"
              : "CODING";
    const body = options.length
      ? lines
          .filter((l) => !OPTION_LINE.test(l))
          .join("\n")
          .trim()
      : block;
    const cleaned = body.replace(QUESTION_START, "").trim() || block;
    return {
      type,
      title: firstLine(cleaned),
      original: block,
      cleaned,
      options,
      answer: "",
      aiAdded: [],
      topics: [],
      difficulty: "MEDIUM" as Difficulty,
      photo: null,
    };
  });
}

// Splits long notes into chunks the model can take at once (free-tier
// token limits), on paragraph breaks.
export function chunkText(text: string, maxChars = 6000): string[] {
  const paras = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paras) {
    if (current && current.length + p.length + 2 > maxChars) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${p}` : p;
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}
