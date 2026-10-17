import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("handles spaces, ampersands and punctuation", () => {
    expect(slugify("Goldman Sachs")).toBe("goldman-sachs");
    expect(slugify("L&T")).toBe("l-and-t");
    expect(slugify("Samsung R&D")).toBe("samsung-r-and-d");
    expect(slugify("  Bar raiser and HR! ")).toBe("bar-raiser-and-hr");
  });
});
