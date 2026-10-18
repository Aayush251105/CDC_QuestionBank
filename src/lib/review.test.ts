import { describe, expect, it } from "vitest";
import {
  countUnclear,
  optionsText,
  parseOptions,
  parseReviewQuestions,
  parseTopics,
  studentCanEdit,
  submissionRef,
} from "./review";

describe("studentCanEdit", () => {
  it("allows drafts and pending ones the CDC has not started", () => {
    expect(studentCanEdit({ status: "DRAFT", reviewStartedAt: null })).toBe(
      true,
    );
    expect(
      studentCanEdit({ status: "PENDING_REVIEW", reviewStartedAt: null }),
    ).toBe(true);
    expect(
      studentCanEdit({
        status: "PENDING_REVIEW",
        reviewStartedAt: new Date(),
      }),
    ).toBe(false);
    expect(studentCanEdit({ status: "PUBLISHED", reviewStartedAt: null })).toBe(
      false,
    );
  });
});

describe("parseOptions", () => {
  it("reads one option per line and gives keys again", () => {
    expect(
      parseOptions("A. Escalate\n\nb) talk to them\n(c) do it\nwait"),
    ).toEqual([
      { key: "A", text: "Escalate" },
      { key: "B", text: "talk to them" },
      { key: "C", text: "do it" },
      { key: "D", text: "wait" },
    ]);
  });

  it("round-trips with optionsText", () => {
    const opts = [
      { key: "A", text: "O(n)" },
      { key: "B", text: "O(1)" },
    ];
    expect(parseOptions(optionsText(opts))).toEqual(opts);
    expect(optionsText(null)).toBe("");
  });
});

describe("parseTopics", () => {
  it("splits on commas, trims and drops repeats", () => {
    expect(parseTopics(" Graphs, BFS ,graphs,, ")).toEqual(["Graphs", "BFS"]);
    expect(parseTopics("a,b,c,d,e,f,g")).toHaveLength(5);
  });
});

describe("countUnclear", () => {
  it("counts markers", () => {
    expect(countUnclear("within D [unclear] days [UNCLEAR]")).toBe(2);
    expect(countUnclear("all clear")).toBe(0);
  });
});

describe("parseReviewQuestions", () => {
  it("keeps valid fields and fixes bad ones", () => {
    const out = parseReviewQuestions([
      {
        id: "q1",
        type: "MCQ",
        difficulty: "EASY",
        cleaned: "  Pick one  ",
        options: "a) yes\nb) no",
        topics: "Work style",
      },
      { id: "q2", type: "PARTY", difficulty: "?", cleaned: "x" },
      { type: "SQL" },
      "junk",
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: "q1",
      type: "MCQ",
      difficulty: "EASY",
      cleaned: "Pick one",
      options: [
        { key: "A", text: "yes" },
        { key: "B", text: "no" },
      ],
      topics: ["Work style"],
    });
    expect(out[1]).toMatchObject({ type: "CODING", difficulty: "MEDIUM" });
    expect(parseReviewQuestions("nope")).toEqual([]);
  });
});

describe("submissionRef", () => {
  it("uses the year and the end of the id", () => {
    expect(submissionRef("cmvc9r1zj002wg4qyiqxg2zfi", 2025)).toBe(
      "SUB-2025-XG2ZFI",
    );
  });
});
