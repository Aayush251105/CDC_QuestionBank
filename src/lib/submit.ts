// Submit flow (S1–S6) helpers. Pure, so they are tested on their own; the
// server actions use them on every request (never trust the browser).
import type { RoundType } from "@/generated/prisma/enums";

export type SubmitStep = "round" | "questions" | "upload" | "review";

// Where a draft resumes ("Continue the draft").
export function stepHref(id: string, lastStep: string): string {
  const step: SubmitStep = (
    ["round", "questions", "upload", "review"] as const
  ).includes(lastStep as SubmitStep)
    ? (lastStep as SubmitStep)
    : "round";
  return `/submit/${id}/${step}`;
}

export const STEPS = ["Drive", "Round", "Questions", "Review"] as const;

type Result<T> =
  { ok: true; data: T } | { ok: false; errors: Record<string, string> };

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

// "2025-08-14" -> Date at UTC midnight, or null.
export function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCDate() === Number(m[3]) ? d : null;
}

// A test date must be real, not far in the past and not in the future.
function checkTestDate(value: string, now: Date, required: boolean) {
  if (!value) return required ? "Enter the date of the test." : null;
  const d = parseDay(value);
  if (!d) return "Enter a real date.";
  if (d.getUTCFullYear() < 2015) return "That date is too far back.";
  if (d.getTime() > now.getTime() + 24 * 60 * 60 * 1000)
    return "The test date cannot be in the future.";
  return null;
}

// ---------- S1: "My drive is not listed" ----------

export type UnlistedDrive = {
  company: string;
  year: number;
  role: string;
  testDate: Date | null;
};

export function parseUnlistedDrive(
  form: FormData,
  now = new Date(),
): Result<UnlistedDrive> {
  const errors: Record<string, string> = {};
  const company = text(form.get("company"));
  const role = text(form.get("role"));
  const year = Number(text(form.get("year")));
  const date = text(form.get("testDate"));

  if (company.length < 2 || company.length > 80)
    errors.company = "Enter the company name.";
  if (role.length < 2 || role.length > 80)
    errors.role = "Enter the role you applied for.";
  if (
    !Number.isInteger(year) ||
    year < 2015 ||
    year > now.getUTCFullYear() + 1
  ) {
    errors.year = "Enter the year of the drive.";
  }
  const dateError = checkTestDate(date, now, false);
  if (dateError) errors.testDate = dateError;
  const testDate = date && !dateError ? parseDay(date) : null;
  if (testDate && !errors.year && testDate.getUTCFullYear() !== year) {
    errors.year = "The year does not match the test date.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { company, year, role, testDate } };
}

// ---------- S2: round details ----------

export const ROUND_TYPES: RoundType[] = ["OA", "TECHNICAL", "HR", "GD"];

export type RoundDetails = {
  round: { kind: "existing"; id: string } | { kind: "new"; type: RoundType };
  testDate: Date;
  platform: string | null;
  durationMin: number | null;
  sections: { name: string; count: number | null }[];
  notes: string | null;
  method: "type" | "scan";
};

export function parseRoundDetails(
  form: FormData,
  now = new Date(),
): Result<RoundDetails> {
  const errors: Record<string, string> = {};

  const choice = text(form.get("round"));
  const newType = text(form.get("roundType")) as RoundType;
  let round: RoundDetails["round"] | null = null;
  if (choice === "new") {
    if (ROUND_TYPES.includes(newType)) round = { kind: "new", type: newType };
    else errors.roundType = "Choose the type of round.";
  } else if (choice) {
    round = { kind: "existing", id: choice };
  } else {
    errors.round = "Choose the round you sat.";
  }

  const date = text(form.get("testDate"));
  const dateError = checkTestDate(date, now, true);
  if (dateError) errors.testDate = dateError;

  const platform = text(form.get("platform")).slice(0, 60) || null;

  const durationText = text(form.get("durationMin"));
  const durationMin = durationText ? Number(durationText) : null;
  if (
    durationMin !== null &&
    (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 600)
  ) {
    errors.durationMin = "Enter the length in minutes (1 to 600).";
  }

  const names = form.getAll("sectionName").map(text);
  const counts = form.getAll("sectionCount").map(text);
  const sections: RoundDetails["sections"] = [];
  names.forEach((name, i) => {
    if (!name) return;
    const n = counts[i] ? Number(counts[i]) : null;
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 200)) {
      errors.sections = "Question counts must be whole numbers.";
    }
    sections.push({ name: name.slice(0, 60), count: n });
  });
  if (sections.length > 10) errors.sections = "Add at most 10 sections.";

  const notes = text(form.get("notes")).slice(0, 1000) || null;
  const method = text(form.get("method")) === "scan" ? "scan" : "type";

  if (Object.keys(errors).length || !round) return { ok: false, errors };
  return {
    ok: true,
    data: {
      round,
      testDate: parseDay(date)!,
      platform,
      durationMin,
      sections,
      notes,
      method,
    },
  };
}
