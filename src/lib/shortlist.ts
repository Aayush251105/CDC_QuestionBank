// Shortlist CSV reading and matching (A06). Pure functions: the file is read
// in the admin's browser and only its rows reach the server.

// Splits CSV text into rows of cells. Handles quoted cells, "" inside
// quotes, commas and line breaks in quotes, and CRLF line ends.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, ""); // Excel's byte order mark

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

export type ColumnUse = "rollNo" | "email" | "name" | "ignore";

// Guess what a column holds from its header ("Roll No", "Email ID", ...).
export function guessColumn(header: string): ColumnUse {
  const h = header.toLowerCase();
  if (/roll|enrol|reg(istration)?\s*no/.test(h)) return "rollNo";
  if (/mail/.test(h)) return "email";
  if (/name/.test(h)) return "name";
  return "ignore";
}

export type ShortlistRow = {
  rowNo: number; // data row in the file, 1 = first row under the headers
  rollNo?: string;
  email?: string;
  name?: string;
};

// Applies the column choices to the data rows (headers already removed).
export function mapRows(data: string[][], uses: ColumnUse[]): ShortlistRow[] {
  return data.map((cells, i) => {
    const row: ShortlistRow = { rowNo: i + 1 };
    uses.forEach((use, col) => {
      const value = cells[col]?.trim();
      if (use !== "ignore" && value) row[use] = value;
    });
    return row;
  });
}

export type Account = {
  id: string;
  name: string;
  email: string;
  rollNo: string | null;
};
export type Match = "ROLL_NO" | "EMAIL" | "NAME" | "NONE";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Roll number first, then SNU email; a name counts only when exactly one
// account has it, and shows as "Likely" in review (A06 "names are only a
// fallback").
export function matchRow(
  row: ShortlistRow,
  accounts: Account[],
): { match: Match; user: Account | null; ambiguous?: boolean } {
  if (row.rollNo) {
    const user = accounts.find(
      (a) => a.rollNo && norm(a.rollNo) === norm(row.rollNo!),
    );
    if (user) return { match: "ROLL_NO", user };
  }
  if (row.email) {
    const user = accounts.find((a) => norm(a.email) === norm(row.email!));
    if (user) return { match: "EMAIL", user };
  }
  if (row.name) {
    const same = accounts.filter((a) => norm(a.name) === norm(row.name!));
    if (same.length === 1) return { match: "NAME", user: same[0] };
    if (same.length > 1) return { match: "NONE", user: null, ambiguous: true };
  }
  return { match: "NONE", user: null };
}

// The shortlist check for one student's submission to a round, from that
// round's current list. No list yet = not checked (null).
export function checkSubmission(
  entries: { matchedUserId: string | null; match: Match }[] | null,
  userId: string,
): "VERIFIED" | "LIKELY" | "NOT_FOUND" | null {
  if (!entries) return null;
  const mine = entries.filter((e) => e.matchedUserId === userId);
  if (mine.some((e) => e.match === "ROLL_NO" || e.match === "EMAIL")) {
    return "VERIFIED";
  }
  if (mine.some((e) => e.match === "NAME")) return "LIKELY";
  return "NOT_FOUND";
}
