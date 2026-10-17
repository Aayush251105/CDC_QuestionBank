import type {
  Difficulty,
  QuestionType,
  RoundType,
} from "@/generated/prisma/enums";

// Display labels for enums, kept in one place.

export const questionTypeLabel: Record<QuestionType, string> = {
  CODING: "Coding",
  MCQ: "MCQ",
  APTITUDE: "Aptitude",
  SQL: "SQL",
  WRITTEN: "Written",
};

export const difficultyLabel: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const roundTypeLabel: Record<RoundType, string> = {
  OA: "Online assessment",
  TECHNICAL: "Technical interview",
  HR: "HR interview",
  GD: "Group discussion",
};

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

// "Good morning" in India time, whatever the server's time zone.
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
