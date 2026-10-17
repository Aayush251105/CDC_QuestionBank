import { describe, expect, it } from "vitest";
import {
  chunkText,
  MAX_QUESTIONS,
  normaliseAiQuestions,
  questionsSchema,
  splitWithoutAi,
  withoutOptionLines,
} from "./aiQuestions";

const TOPICS = ["Sliding window", "SQL", "Graphs"];

describe("questionsSchema", () => {
  it("limits topics to our list and requires every field", () => {
    const s = questionsSchema(TOPICS);
    const item = s.properties.questions.items;
    expect(item.properties.topics.items.enum).toEqual(TOPICS);
    expect(item.required).toContain("cleaned");
    expect(item.additionalProperties).toBe(false);
  });
});

describe("normaliseAiQuestions", () => {
  it("keeps good questions and drops junk", () => {
    const out = normaliseAiQuestions(
      {
        questions: [
          {
            type: "MCQ",
            title: "Pointer output",
            original: "what prints a 1 b 2",
            cleaned: "What does this print?",
            options: [
              { key: "a", text: "1" },
              { key: "b", text: "2" },
              { key: "c", text: "" },
            ],
            answer: "",
            topics: ["Graphs", "Made up topic", "Graphs"],
            difficulty: "EASY",
          },
          { type: "PARTY", cleaned: "x = ?", difficulty: "IMPOSSIBLE" },
          { cleaned: "" },
          "not an object",
        ],
      },
      TOPICS,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      type: "MCQ",
      options: [
        { key: "A", text: "1" },
        { key: "B", text: "2" },
      ],
      topics: ["Graphs"],
    });
    expect(out[1]).toMatchObject({
      type: "CODING",
      difficulty: "MEDIUM",
      title: "x = ?",
      original: "x = ?",
    });
  });

  it("survives a reply that is not the right shape", () => {
    expect(normaliseAiQuestions(null, TOPICS)).toEqual([]);
    expect(normaliseAiQuestions({ questions: "nope" }, TOPICS)).toEqual([]);
    const many = {
      questions: Array.from({ length: 60 }, () => ({ cleaned: "q" })),
    };
    expect(normaliseAiQuestions(many, TOPICS)).toHaveLength(MAX_QUESTIONS);
  });
});

describe("splitWithoutAi", () => {
  it("splits on blank lines and numbered starts, and guesses types", () => {
    const notes = [
      "Q1. longest substring with at most k distinct chars",
      "Q2 teammate misses deadline what do u do",
      "a) escalate",
      "b) talk to them",
      "",
      "second highest salary from employee table",
      "",
      "train 240m at 54 km/h crosses platform in 30s, platform length?",
    ].join("\n");
    const out = splitWithoutAi(notes);
    expect(out.map((q) => q.type)).toEqual([
      "CODING",
      "MCQ",
      "SQL",
      "APTITUDE",
    ]);
    expect(out[1].options).toEqual([
      { key: "A", text: "escalate" },
      { key: "B", text: "talk to them" },
    ]);
    expect(out[0].cleaned).toBe(
      "longest substring with at most k distinct chars",
    );
  });
});

describe("splitWithoutAi options on one line", () => {
  it("splits a) b) c) written on the same line", () => {
    const [q] = splitWithoutAi(
      "heap build time\na) O(n) b) O(n log n) c) O(log n) d) O(1)",
    );
    expect(q.type).toBe("MCQ");
    expect(q.options.map((o) => o.text)).toEqual([
      "O(n)",
      "O(n log n)",
      "O(log n)",
      "O(1)",
    ]);
    expect(q.cleaned).toBe("heap build time");
  });
});

describe("photo numbers", () => {
  it("never takes a photo number from the model", () => {
    const [q] = normaliseAiQuestions(
      { questions: [{ cleaned: "q", photo: 2 }] },
      TOPICS,
    );
    expect(q.photo).toBeNull();
    expect(splitWithoutAi("typed question here")[0].photo).toBeNull();
  });
});

describe("withoutOptionLines", () => {
  it("drops option lists the model repeated in the text", () => {
    expect(
      withoutOptionLines(
        "Time to build a heap.\n\nOptions: a) O(n) b) O(n log n)\n\n**Options:** 8h, 10h",
      ),
    ).toBe("Time to build a heap.");
    expect(withoutOptionLines("a) O(n) b) O(1)\nkeep me")).toBe("keep me");
    // a single "a) ..." line inside the question is left alone
    expect(withoutOptionLines("Consider:\na) the first case")).toBe(
      "Consider:\na) the first case",
    );
  });
});

describe("chunkText", () => {
  it("keeps short text whole and splits long text on paragraphs", () => {
    expect(chunkText("a\n\nb", 100)).toEqual(["a\n\nb"]);
    const long = Array.from(
      { length: 5 },
      (_, i) => `para ${i} ${"x".repeat(40)}`,
    ).join("\n\n");
    const chunks = chunkText(long, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
  });
});
