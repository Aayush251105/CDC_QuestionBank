import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("splits paragraphs, lists and code blocks", () => {
    const md = [
      "Given a string `s`.",
      "Second line.",
      "",
      "**Constraints**",
      "",
      "- 1 ≤ |s| ≤ 10^5",
      "- 0 ≤ k ≤ 26",
      "",
      "```c",
      "int *p = a;",
      "",
      'printf("%d", *p);',
      "```",
    ].join("\n");
    expect(parseMarkdown(md)).toEqual([
      { type: "para", text: "Given a string `s`.\nSecond line." },
      { type: "para", text: "**Constraints**" },
      { type: "list", items: ["1 ≤ |s| ≤ 10^5", "0 ≤ k ≤ 26"] },
      { type: "code", lang: "c", text: 'int *p = a;\n\nprintf("%d", *p);' },
    ]);
  });

  it("keeps an unclosed code block instead of losing text", () => {
    expect(parseMarkdown("```\nx = 1")).toEqual([
      { type: "code", lang: "", text: "x = 1" },
    ]);
  });

  it("treats HTML as plain text", () => {
    expect(parseMarkdown("<script>alert(1)</script>")).toEqual([
      { type: "para", text: "<script>alert(1)</script>" },
    ]);
  });
});

describe("parseInline", () => {
  it("finds code and bold", () => {
    expect(parseInline("Use `k` and **two** pointers")).toEqual([
      { type: "text", text: "Use " },
      { type: "code", text: "k" },
      { type: "text", text: " and " },
      { type: "bold", text: "two" },
      { type: "text", text: " pointers" },
    ]);
  });
});
