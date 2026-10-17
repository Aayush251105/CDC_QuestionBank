// A drive is one company visit (CLAUDE.md 2a.8). Usually one per year; a
// second visit in the same year has sequence 2.

const letter = (sequence: number) => String.fromCharCode(64 + sequence); // 1 -> A

// "2025" when the company came once that year, "2025 · B" when it came again.
export function driveLabel(
  year: number,
  sequence: number,
  visitsThatYear: number,
): string {
  return visitsThatYear > 1 ? `${year} · ${letter(sequence)}` : String(year);
}

// URL part: "2025" for the first visit, "2025-b" for the second. The first
// visit keeps "2025" even if a second one is added later, so links never break.
export function driveSegment(year: number, sequence: number): string {
  return sequence > 1
    ? `${year}-${letter(sequence).toLowerCase()}`
    : String(year);
}

export function parseDriveSegment(
  segment: string,
): { year: number; sequence: number } | null {
  const m = /^(\d{4})(?:-([b-z]))?$/.exec(segment.toLowerCase());
  if (!m) return null;
  return {
    year: Number(m[1]),
    sequence: m[2] ? m[2].charCodeAt(0) - 96 : 1,
  };
}

// Roles a round is for: its own list, or every role in the drive when empty.
export function roundRoles(
  roundRoles: string[],
  driveRoles: string[],
): string[] {
  return roundRoles.length ? roundRoles : driveRoles;
}
