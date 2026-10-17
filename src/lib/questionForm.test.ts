import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";
import {
  cleanInput,
  composeMarkdown,
  emptyFields,
  filledOptions,
  isComplete,
  type QuestionInput,
  questionTitle,
} from "./questionForm";

const q = (
  over: Partial<QuestionInput> & { f?: Partial<QuestionInput["fields"]> },
): QuestionInput => ({
  type: over.type ?? "CODING",
  section: "",
  difficultyFelt: null,
  notes: "",
  fields: { ...emptyFields(), ...over.f },
});

describe("composeMarkdown", () => {
  it("builds a coding question with constraints and an example", () => {
    const md = composeMarkdown(
      q({
        f: {
          statement: "find min C to ship all within D days",
          constraints: "1 <= n <= 5*10^4",
          sampleInput: "w = [1,2,3]\nD = 2",
          sampleOutput: "3",
        },
      }),
    );
    expect(md).toBe(
      [
        "find min C to ship all within D days",
        "**Constraints**",
        "```\n1 <= n <= 5*10^4\n```",
        "**Example**",
        "```\nInput:\nw = [1,2,3]\nD = 2\nOutput:\n3\n```",
      ].join("\n\n"),
    );
    // and it renders as markdown blocks the site understands
    expect(parseMarkdown(md).map((b) => b.type)).toEqual([
      "para",
      "para",
      "code",
      "para",
      "code",
    ]);
  });

  it("keeps MCQ code in a code block and leaves options out of the text", () => {
    const md = composeMarkdown(
      q({
        type: "MCQ",
        f: {
          statement: "Output?",
          code: 'printf("%d", 1);',
          options: ["1", "2", "", ""],
        },
      }),
    );
    expect(md).toBe('Output?\n\n```\nprintf("%d", 1);\n```');
  });

  it("adds SQL tables and written limits", () => {
    expect(
      composeMarkdown(
        q({
          type: "SQL",
          f: { statement: "Second salary", tables: "emp(id, salary)" },
        }),
      ),
    ).toBe("Second salary\n\n**Tables**\n\n```sql\nemp(id, salary)\n```");
    expect(
      composeMarkdown(
        q({
          type: "WRITTEN",
          f: { statement: "Essay", wordLimit: "250", timeMin: "20" },
        }),
      ),
    ).toBe("Essay\n\nWord limit: 250 · Time: 20 minutes");
  });
});

describe("helpers", () => {
  it("titles, completeness and options", () => {
    expect(questionTitle(q({ f: { title: "Truck capacity" } }))).toBe(
      "Truck capacity",
    );
    expect(questionTitle(q({ f: { statement: "x".repeat(80) } }))).toHaveLength(
      58,
    );
    expect(questionTitle(q({}))).toBe("Untitled question");
    expect(isComplete(q({ f: { statement: "short" } }))).toBe(false);
    expect(
      isComplete(q({ f: { statement: "a proper problem statement" } })),
    ).toBe(true);
    expect(
      filledOptions({ ...emptyFields(), options: ["1", "", "3"] }),
    ).toEqual([
      { key: "A", text: "1" },
      { key: "C", text: "3" },
    ]);
  });
});

describe("cleanInput", () => {
  it("rejects unknown types and caps lengths", () => {
    expect(cleanInput({ type: "HACK" })).toBeNull();
    const c = cleanInput({
      type: "MCQ",
      difficultyFelt: "IMPOSSIBLE",
      fields: {
        title: "t".repeat(500),
        options: Array(10).fill("o"),
        statement: 42,
      },
    })!;
    expect(c.fields.title).toHaveLength(120);
    expect(c.fields.options).toHaveLength(6);
    expect(c.fields.statement).toBe("");
    expect(c.difficultyFelt).toBeNull();
  });
});
