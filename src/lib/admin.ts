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

// ---------- New drive form (A03) ----------

export type RoundTypeKey = "OA" | "TECHNICAL" | "HR" | "GD";

const roundTypeName: Record<RoundTypeKey, string> = {
  OA: "Online assessment",
  TECHNICAL: "Technical interview",
  HR: "HR interview",
  GD: "Group discussion",
};

// Round names from their types, numbered when a type repeats:
// OA, TECHNICAL, TECHNICAL -> "Online assessment", "Technical interview 1",
// "Technical interview 2".
export function roundNames(types: RoundTypeKey[]): string[] {
  const seen = new Map<RoundTypeKey, number>();
  return types.map((t) => {
    const n = (seen.get(t) ?? 0) + 1;
    seen.set(t, n);
    const repeats = types.filter((x) => x === t).length > 1;
    return repeats ? `${roundTypeName[t]} ${n}` : roundTypeName[t];
  });
}

// Default end of the submission window: some days after the last round
// (A00b: 14 by default; a super admin can change it in A13).
export function defaultCloseDate(
  roundDates: (Date | null)[],
  days = 14,
): Date | null {
  const times = roundDates
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime());
  return times.length ? new Date(Math.max(...times) + days * DAY) : null;
}

// "2025-08-14" from an <input type="date"> -> UTC midnight, or null.
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// UTC midnight -> "2025-08-14" for an <input type="date">.
export function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
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

// ---------- Companies (A10) ----------

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// "Possible duplicate of Amazon": for each company, another one whose name
// is the start of its name ("Amazon Web Services" / "Amazon"), or that
// shares a name or alias with it. The admin decides whether to merge.
export function possibleDuplicates(
  companies: { id: string; name: string; aliases: string[] }[],
): Map<string, string> {
  const result = new Map<string, string>(); // id -> name of the likely original
  for (const c of companies) {
    const name = words(c.name);
    const mine = new Set([name, ...c.aliases.map(words)]);
    for (const other of companies) {
      if (other.id === c.id) continue;
      const otherName = words(other.name);
      const theirs = [otherName, ...other.aliases.map(words)];
      const prefix = name.startsWith(`${otherName} `);
      const shared = theirs.some((t) => t && mine.has(t));
      // Report the shorter name as the original, so only one row is flagged.
      if (prefix || (shared && otherName.length < name.length)) {
        result.set(c.id, other.name);
        break;
      }
    }
  }
  return result;
}

// ---------- Students (A11) ----------

// Why a student was blocked; kept in the audit log, never shown to them.
export const BLOCK_REASONS = [
  "Shared questions outside SNU",
  "Submitted for drives they did not sit",
  "Abusive content",
  "Other",
];

// ---------- Reminder emails (A06, CLAUDE.md 2a.11) ----------

// The ready-made "please share your questions" email. The admin can edit
// it before sending. It never mentions review outcomes.
export function reminderMessage(m: {
  drive: string; // "Amazon 2025 SDE intern"
  round: string; // "Online assessment"
  site: string; // "https://questions.snu.edu.in"
  pin: string | null; // "482 915", only while the PIN works
  until: string | null; // "30 Sep 2025"
}) {
  return {
    subject: `Reminder: share your ${m.drive} ${m.round} questions`,
    text: [
      `You were shortlisted for the ${m.round} of the ${m.drive} drive, and we have not received your questions yet.`,
      "",
      "Please share the questions you remember on the CDC Placement Question Bank. It takes a few minutes and helps every SNU student who sits this test after you.",
      "",
      ...(m.pin ? [`Your drive PIN: ${m.pin}`] : []),
      `Submit here: ${m.site}/submit`,
      ...(m.until ? [`Submissions close on ${m.until}.`] : []),
      "",
      "You will stop getting these reminders once you have submitted.",
      "",
      "Career Development Centre, Shiv Nadar University",
    ].join("\n"),
  };
}

// Split a list into groups of at most `size` (BCC batches).
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
