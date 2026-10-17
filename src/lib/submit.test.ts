import { describe, expect, it } from "vitest";
import {
  parseDay,
  parseRoundDetails,
  parseUnlistedDrive,
  stepHref,
} from "./submit";

const NOW = new Date("2025-10-17T10:00:00Z");
const form = (entries: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe("stepHref", () => {
  it("resumes at the last step, or the round step", () => {
    expect(stepHref("abc", "questions")).toBe("/submit/abc/questions");
    expect(stepHref("abc", "../admin")).toBe("/submit/abc/round");
  });
});

describe("parseDay", () => {
  it("accepts real dates only", () => {
    expect(parseDay("2025-08-14")?.toISOString()).toBe(
      "2025-08-14T00:00:00.000Z",
    );
    expect(parseDay("2025-02-30")).toBeNull();
    expect(parseDay("14/08/2025")).toBeNull();
  });
});

describe("parseUnlistedDrive", () => {
  it("accepts a sensible drive", () => {
    const r = parseUnlistedDrive(
      form([
        ["company", " Zomato "],
        ["year", "2025"],
        ["role", "SDE intern"],
        ["testDate", "2025-10-01"],
      ]),
      NOW,
    );
    expect(r).toEqual({
      ok: true,
      data: {
        company: "Zomato",
        year: 2025,
        role: "SDE intern",
        testDate: new Date("2025-10-01T00:00:00Z"),
      },
    });
  });

  it("needs the year to match the test date", () => {
    const r = parseUnlistedDrive(
      form([
        ["company", "Zomato"],
        ["year", "2026"],
        ["role", "SDE"],
        ["testDate", "2025-10-01"],
      ]),
      new Date("2026-10-17T10:00:00Z"),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.year).toMatch(/does not match/);
  });

  it("explains what is missing", () => {
    const r = parseUnlistedDrive(
      form([
        ["company", "Z"],
        ["year", "1999"],
        ["testDate", "2030-01-01"],
      ]),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        "company",
        "role",
        "testDate",
        "year",
      ]);
  });
});

describe("parseRoundDetails", () => {
  const base: [string, string][] = [
    ["round", "round-1"],
    ["testDate", "2025-08-14"],
    ["platform", "HackerRank"],
    ["durationMin", "105"],
    ["sectionName", "Coding"],
    ["sectionCount", "2"],
    ["sectionName", ""],
    ["sectionCount", ""],
    ["notes", "Camera proctored."],
  ];

  it("reads an existing round with sections", () => {
    const r = parseRoundDetails(form(base), NOW);
    expect(r).toEqual({
      ok: true,
      data: {
        round: { kind: "existing", id: "round-1" },
        testDate: new Date("2025-08-14T00:00:00Z"),
        platform: "HackerRank",
        durationMin: 105,
        sections: [{ name: "Coding", count: 2 }],
        notes: "Camera proctored.",
      },
    });
  });

  it("needs a type for a new round and rejects bad numbers", () => {
    const r = parseRoundDetails(
      form([
        ["round", "new"],
        ["roundType", "PARTY"],
        ["testDate", ""],
        ["durationMin", "-5"],
      ]),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        "durationMin",
        "roundType",
        "testDate",
      ]);
  });

  it("accepts a new round of a known type", () => {
    const r = parseRoundDetails(
      form([
        ["round", "new"],
        ["roundType", "TECHNICAL"],
        ["testDate", "2025-10-16"],
      ]),
      NOW,
    );
    expect(r.ok && r.data.round).toEqual({ kind: "new", type: "TECHNICAL" });
  });
});
