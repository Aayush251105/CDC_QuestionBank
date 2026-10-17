import { describe, expect, it } from "vitest";
import {
  HIT_END,
  HIT_START,
  parseHeadline,
  parseSearchFilters,
  searchHref,
  takeTypeWords,
  takeYear,
} from "./search";

describe("parseSearchFilters", () => {
  it("reads several types and difficulties and ignores junk", () => {
    const f = parseSearchFilters({
      q: " sliding window ",
      type: ["coding", "MCQ", "nope", "coding"],
      difficulty: "hard",
      year: "2025",
      round: "oa",
      sort: "newest",
      page: "3",
    });
    expect(f).toEqual({
      q: "sliding window",
      types: ["CODING", "MCQ"],
      difficulties: ["HARD"],
      company: undefined,
      year: 2025,
      round: "OA",
      topic: undefined,
      sort: "newest",
      page: 3,
    });
  });

  it("falls back to safe defaults", () => {
    const f = parseSearchFilters({
      year: "1999",
      round: "x",
      sort: "drop",
      page: "-1",
    });
    expect(f).toMatchObject({
      q: "",
      year: undefined,
      round: undefined,
      sort: "best",
      page: 1,
    });
  });
});

describe("takeYear", () => {
  it("pulls a year out of the query", () => {
    expect(takeYear("Amazon 2025")).toEqual({ year: 2025, rest: "Amazon" });
    expect(takeYear("sliding window")).toEqual({ rest: "sliding window" });
    expect(takeYear("12025 apples")).toEqual({ rest: "12025 apples" });
  });
});

describe("parseHeadline", () => {
  it("splits highlighted words and drops markdown", () => {
    const h = `use a ${HIT_START}sliding${HIT_END} ${HIT_START}window${HIT_END} on \`s\` **now**`;
    expect(parseHeadline(h)).toEqual([
      { text: "use a ", hit: false },
      { text: "sliding", hit: true },
      { text: " ", hit: false },
      { text: "window", hit: true },
      { text: " on s now", hit: false },
    ]);
  });
});

describe("searchHref", () => {
  it("keeps only what is set", () => {
    expect(
      searchHref({ q: "dp", types: ["CODING", "SQL"], sort: "best", page: 1 }),
    ).toBe("/search?q=dp&type=coding&type=sql");
    expect(searchHref({})).toBe("/search");
  });
});

describe("takeTypeWords", () => {
  it("turns type words into a type filter", () => {
    expect(takeTypeWords("amazon coding")).toEqual({
      types: ["CODING"],
      rest: "amazon",
    });
    expect(takeTypeWords("MCQ pointers")).toEqual({
      types: ["MCQ"],
      rest: "pointers",
    });
    expect(takeTypeWords("sql joins")).toEqual({
      types: [],
      rest: "sql joins",
    });
  });
});
