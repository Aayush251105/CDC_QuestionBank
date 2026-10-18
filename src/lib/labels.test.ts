import { describe, expect, it } from "vitest";
import { greeting, istDate, istDateTime, plural, timeAgo } from "./labels";

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

describe("India-time dates", () => {
  it("formats in IST, not UTC", () => {
    // 16:11 UTC is 21:41 IST
    const d = new Date("2025-08-12T16:11:00Z");
    expect(istDate(d)).toBe("12 Aug 2025");
    expect(istDateTime(d)).toBe("12 Aug 2025, 9:41 pm");
    // 20:00 UTC on the 12th is already the 13th in India
    expect(istDate(new Date("2025-08-12T20:00:00Z"))).toBe("13 Aug 2025");
  });

  it("says how long ago", () => {
    const now = new Date("2025-08-12T12:00:00Z");
    const before = (ms: number) => new Date(now.getTime() - ms);
    expect(timeAgo(before(20_000), now)).toBe("just now");
    expect(timeAgo(before(60_000), now)).toBe("1 minute ago");
    expect(timeAgo(before(2 * 3600_000), now)).toBe("2 hours ago");
    expect(timeAgo(before(30 * 3600_000), now)).toBe("yesterday");
    expect(timeAgo(before(5 * 86400_000), now)).toBe("7 Aug 2025");
  });
});
