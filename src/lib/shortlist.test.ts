import { describe, expect, it } from "vitest";
import {
  checkSubmission,
  guessColumn,
  mapRows,
  matchRow,
  parseCsv,
  type Account,
} from "./shortlist";

describe("parseCsv", () => {
  it("reads plain rows and CRLF line ends", () => {
    expect(parseCsv("Roll No,Name\r\n2210110204,Aarav Sharma\r\n")).toEqual([
      ["Roll No", "Name"],
      ["2210110204", "Aarav Sharma"],
    ]);
  });

  it("handles quotes, commas in quotes and blank lines", () => {
    expect(parseCsv('﻿Name,Note\n"Shah, Tanvi","said ""hi"""\n\n,\n')).toEqual([
      ["Name", "Note"],
      ["Shah, Tanvi", 'said "hi"'],
    ]);
  });
});

describe("columns", () => {
  it("guesses columns from headers", () => {
    expect(guessColumn("Roll No")).toBe("rollNo");
    expect(guessColumn("Email ID")).toBe("email");
    expect(guessColumn("Student Name")).toBe("name");
    expect(guessColumn("Branch")).toBe("ignore");
  });

  it("maps rows with the chosen columns", () => {
    expect(
      mapRows(
        [
          ["2210110204", "Aarav", "CSE"],
          ["", "Tanvi", "CSE"],
        ],
        ["rollNo", "name", "ignore"],
      ),
    ).toEqual([
      { rowNo: 1, rollNo: "2210110204", name: "Aarav" },
      { rowNo: 2, name: "Tanvi" },
    ]);
  });
});

describe("matchRow", () => {
  const accounts: Account[] = [
    {
      id: "a",
      name: "Aarav Sharma",
      email: "as123@snu.edu.in",
      rollNo: "2210110204",
    },
    { id: "t", name: "Tanvi Shah", email: "ts512@snu.edu.in", rollNo: null },
    { id: "r1", name: "Riya Mehta", email: "rm1@snu.edu.in", rollNo: null },
    { id: "r2", name: "Riya Mehta", email: "rm2@snu.edu.in", rollNo: null },
  ];

  it("matches roll number, then email, then a unique name", () => {
    expect(
      matchRow({ rowNo: 1, rollNo: "2210110204" }, accounts),
    ).toMatchObject({
      match: "ROLL_NO",
      user: { id: "a" },
    });
    expect(
      matchRow({ rowNo: 1, email: "TS512@snu.edu.in" }, accounts),
    ).toMatchObject({
      match: "EMAIL",
      user: { id: "t" },
    });
    expect(
      matchRow({ rowNo: 1, name: " tanvi  shah" }, accounts),
    ).toMatchObject({
      match: "NAME",
      user: { id: "t" },
    });
  });

  it("does not guess between two students with the same name", () => {
    expect(matchRow({ rowNo: 1, name: "Riya Mehta" }, accounts)).toEqual({
      match: "NONE",
      user: null,
      ambiguous: true,
    });
    expect(matchRow({ rowNo: 1, rollNo: "2210110999" }, accounts)).toEqual({
      match: "NONE",
      user: null,
    });
  });
});

describe("checkSubmission", () => {
  const entries = [
    { matchedUserId: "a", match: "ROLL_NO" as const },
    { matchedUserId: "t", match: "NAME" as const },
    { matchedUserId: null, match: "NONE" as const },
  ];

  it("tags submissions from the round's list", () => {
    expect(checkSubmission(entries, "a")).toBe("VERIFIED");
    expect(checkSubmission(entries, "t")).toBe("LIKELY");
    expect(checkSubmission(entries, "x")).toBe("NOT_FOUND");
    expect(checkSubmission(null, "a")).toBeNull();
  });
});
