// S3a "Type questions": the per-type form, its checks, and the markdown the
// rest of the flow works from. Pure, so it is tested on its own and the
// server action runs the same checks (never trust the browser).
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";

export const QUESTION_TYPES: QuestionType[] = [
  "CODING",
  "MCQ",
  "APTITUDE",
  "SQL",
  "WRITTEN",
];
export const MAX_QUESTIONS = 40;
const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

// Everything the form can hold; each type uses some of it.
export type QuestionFields = {
  title: string;
  statement: string; // problem, question, query task or prompt
  constraints: string; // coding
  sampleInput: string; // coding
  sampleOutput: string; // coding
  code: string; // MCQ: code or extra text
  options: string[]; // MCQ and aptitude
  correct: string; // MCQ: "A".."F"; aptitude: the answer text
  tables: string; // SQL
  expected: string; // SQL
  wordLimit: string; // written
  timeMin: string; // written
};

export type QuestionInput = {
  type: QuestionType;
  section: string;
  difficultyFelt: Difficulty | null;
  notes: string;
  fields: QuestionFields;
};

export const emptyFields = (): QuestionFields => ({
  title: "",
  statement: "",
  constraints: "",
  sampleInput: "",
  sampleOutput: "",
  code: "",
  options: ["", "", "", ""],
  correct: "",
  tables: "",
  expected: "",
  wordLimit: "",
  timeMin: "",
});

const LIMITS: Partial<Record<keyof QuestionFields, number>> = {
  title: 120,
  statement: 5000,
  constraints: 2000,
  sampleInput: 2000,
  sampleOutput: 2000,
  code: 3000,
  tables: 2000,
  expected: 1000,
  correct: 300,
  wordLimit: 6,
  timeMin: 4,
};

// Trims and caps everything, whatever the browser sent.
export function cleanInput(raw: unknown): QuestionInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = QUESTION_TYPES.find((t) => t === r.type);
  if (!type) return null;
  const f = (r.fields ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : "";

  const fields = emptyFields();
  for (const key of Object.keys(LIMITS) as (keyof QuestionFields)[]) {
    if (key !== "options") (fields[key] as string) = str(f[key], LIMITS[key]!);
  }
  fields.options = Array.isArray(f.options)
    ? f.options.slice(0, OPTION_KEYS.length).map((o) => str(o, 300))
    : [];
  const difficulty = ["EASY", "MEDIUM", "HARD"].find(
    (d) => d === r.difficultyFelt,
  ) as Difficulty | undefined;
  return {
    type,
    section: str(r.section, 60).trim(),
    difficultyFelt: difficulty ?? null,
    notes: str(r.notes, 1000),
    fields,
  };
}

// Has the student written the main text yet? ("complete" in the list)
export function isComplete(q: Pick<QuestionInput, "fields">): boolean {
  return q.fields.statement.trim().length >= 10;
}

// Short title for the list: the student's own, else the start of the text.
export function questionTitle(q: Pick<QuestionInput, "fields">): string {
  const own = q.fields.title.trim();
  if (own) return own;
  const first = q.fields.statement.trim().split("\n")[0] ?? "";
  if (!first) return "Untitled question";
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
}

// MCQ / aptitude options that are filled in, with their letters.
export function filledOptions(
  fields: QuestionFields,
): { key: string; text: string }[] {
  return fields.options
    .map((text, i) => ({ key: OPTION_KEYS[i], text: text.trim() }))
    .filter((o) => o.text);
}

const fence = (text: string, lang = "") =>
  `\`\`\`${lang}\n${text.trim()}\n\`\`\``;

// The markdown the cleanup step and the CDC see, built from the form.
export function composeMarkdown(q: QuestionInput): string {
  const f = q.fields;
  const parts: string[] = [];
  const add = (...p: string[]) => parts.push(...p.filter(Boolean));
  const statement = f.statement.trim();

  switch (q.type) {
    case "CODING":
      add(statement);
      if (f.constraints.trim()) add("**Constraints**", fence(f.constraints));
      if (f.sampleInput.trim() || f.sampleOutput.trim()) {
        add(
          "**Example**",
          fence(
            [
              f.sampleInput.trim() && `Input:\n${f.sampleInput.trim()}`,
              f.sampleOutput.trim() && `Output:\n${f.sampleOutput.trim()}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        );
      }
      break;
    case "MCQ":
      add(statement);
      if (f.code.trim()) add(fence(f.code));
      break;
    case "APTITUDE":
      add(statement);
      if (f.correct.trim())
        add(`**Answer (as remembered):** ${f.correct.trim()}`);
      break;
    case "SQL":
      add(statement);
      if (f.tables.trim()) add("**Tables**", fence(f.tables, "sql"));
      if (f.expected.trim()) add("**Expected output**", fence(f.expected));
      break;
    case "WRITTEN": {
      add(statement);
      const limits = [
        f.wordLimit.trim() && `Word limit: ${f.wordLimit.trim()}`,
        f.timeMin.trim() && `Time: ${f.timeMin.trim()} minutes`,
      ].filter(Boolean);
      if (limits.length) add(limits.join(" · "));
      break;
    }
  }
  return parts.join("\n\n");
}
