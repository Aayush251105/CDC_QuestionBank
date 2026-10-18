import { describe, expect, it } from "vitest";
import { duplicateGroups, normaliseTitle, reviewNotes } from "./review";

describe("duplicateGroups", () => {
  it("normalises titles", () => {
    expect(normaliseTitle("  Design an LRU-cache! ")).toBe(
      "design an lru cache",
    );
  });

  it("groups the same title from several submissions or a published question", () => {
    const groups = duplicateGroups([
      { title: "Design an LRU cache", roundName: "Tech 1", submissionId: "s1" },
      { title: "design an LRU cache", roundName: "Tech 1", submissionId: "s2" },
      { title: "Truck capacity", roundName: "OA", submissionId: "s3" },
      { title: "Truck capacity", roundName: "OA", submissionId: null },
      { title: "Only once", roundName: "OA", submissionId: "s4" },
      { title: "Published twice", roundName: "OA", submissionId: null },
      { title: "Published twice", roundName: "OA", submissionId: null },
    ]);
    expect(groups.map((g) => [g.title, g.senders, g.published])).toEqual([
      ["Design an LRU cache", 2, 0],
      ["Truck capacity", 1, 1],
    ]);
    expect(groups[0].firstSubmissionId).toBe("s1");
  });
});

describe("reviewNotes", () => {
  it("lists what needs a look", () => {
    expect(
      reviewNotes({
        tag: "NOT_FOUND",
        roundOrder: 2,
        duplicates: 2,
        unclear: 0,
      }),
    ).toBe("Duplicate of 2 others · Not on round 2 shortlist");
    expect(
      reviewNotes({
        tag: "VERIFIED",
        roundOrder: 1,
        duplicates: 0,
        unclear: 1,
      }),
    ).toBe("1 part marked [unclear]");
    expect(
      reviewNotes({
        tag: "VERIFIED",
        roundOrder: 1,
        duplicates: 0,
        unclear: 0,
      }),
    ).toBe("None");
  });
});
