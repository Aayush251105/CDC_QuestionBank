import { describe, expect, it } from "vitest";
import { greeting, plural } from "./labels";

describe("greeting", () => {
  it("uses India time", () => {
    // 03:30 UTC = 09:00 IST
    expect(greeting(new Date("2026-10-17T03:30:00Z"))).toBe("Good morning");
    // 08:30 UTC = 14:00 IST
    expect(greeting(new Date("2026-10-17T08:30:00Z"))).toBe("Good afternoon");
    // 14:30 UTC = 20:00 IST
    expect(greeting(new Date("2026-10-17T14:30:00Z"))).toBe("Good evening");
  });
});

describe("plural", () => {
  it("picks the right word", () => {
    expect(plural(1, "question")).toBe("1 question");
    expect(plural(3, "question")).toBe("3 questions");
    expect(plural(0, "company", "companies")).toBe("0 companies");
  });
});
