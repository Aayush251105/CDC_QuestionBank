import { describe, expect, it } from "vitest";
import { normalisePin, slugify } from "./slug";

describe("slugify", () => {
  it("handles spaces, ampersands and punctuation", () => {
    expect(slugify("Goldman Sachs")).toBe("goldman-sachs");
    expect(slugify("L&T")).toBe("l-and-t");
    expect(slugify("Samsung R&D")).toBe("samsung-r-and-d");
    expect(slugify("  Bar raiser and HR! ")).toBe("bar-raiser-and-hr");
  });
});

describe("normalisePin", () => {
  it("ignores case, spaces and hyphens", () => {
    expect(normalisePin(" amzn int 25 ")).toBe("AMZNINT25");
    expect(normalisePin("AMZN-INT-25")).toBe("AMZNINT25");
  });
});
