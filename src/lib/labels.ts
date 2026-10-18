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
  OTHER: "Other",
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
  OTHER: "Other round",
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Round dates are stored as UTC midnight.
// "14 Aug 2025"
export function fullDate(date: Date | null): string {
  if (!date) return "Date not shared";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// "Sep 2025"
export function monthYear(date: Date | null): string {
  if (!date) return "–";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Timestamps (submitted, saved) in India time, whatever the server's zone.
// "12 Aug 2025"
export function istDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

// "12 Aug 2025, 9:41 pm"
export function istDateTime(date: Date): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
    .format(date)
    .replace(/\s?([ap])\.?m\.?$/i, " $1m")
    .toLowerCase();
  return `${istDate(date)}, ${time}`;
}

// "just now", "5 minutes ago", "2 hours ago", "yesterday", then the date.
export function timeAgo(date: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  if (hours < 48) return "yesterday";
  return istDate(date);
}
