// Pure helpers for the admin portal (designs in CDC-Portal-Designs/admin).

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

const DAY = 86_400_000;

// "Amazon · 2025 · SDE intern". A second visit in the same year shows as
// "2025 · B" (CLAUDE.md 2a.8).
export function driveTitle(drive: {
  year: number;
  sequence: number;
  roles: string[];
  company: { name: string };
}): string {
  const year =
    drive.sequence > 1
      ? `${drive.year} · ${String.fromCharCode(64 + drive.sequence)}`
      : String(drive.year);
  return [drive.company.name, year, drive.roles.join(", ")]
    .filter(Boolean)
    .join(" · ");
}

// "22 Oct"
export function dayMonth(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

const dayNumber = (d: Date) => Math.floor(d.getTime() / DAY);

// How long ago, in whole days: "Today", "Yesterday", "3 days", then "22 Oct".
export function daysAgo(date: Date, now: Date = new Date()): string {
  const days = dayNumber(now) - dayNumber(date);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days`;
  return dayMonth(date);
}

// Placement seasons run July to June: "2025–26" starts 1 July 2025.
export function seasonOf(now: Date = new Date()) {
  const startYear =
    now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    label: `${startYear}–${String(startYear + 1).slice(2)}`,
    start: new Date(Date.UTC(startYear, 6, 1)),
  };
}

// What the admin PIN tags show (A00b "PIN states"). The submission window is
// the admin side's view; whether a PIN opens a drive for a student is
// pinOpensDrive() in src/lib/pin.ts.
export type PinState = "No PIN" | "Active" | "Off" | "Expired";

export function pinState(
  drive: {
    status: "DRAFT" | "OPEN" | "CLOSED";
    submissionPin: string | null;
    pinEnabled: boolean;
    closesAt: Date | null;
  },
  now: Date = new Date(),
): PinState {
  if (drive.submissionPin === null) return "No PIN";
  if (!drive.pinEnabled) return "Off";
  if (drive.status === "CLOSED" || (drive.closesAt && drive.closesAt < now)) {
    return "Expired";
  }
  return "Active";
}
