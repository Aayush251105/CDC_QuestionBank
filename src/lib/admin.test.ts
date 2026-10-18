import { describe, expect, it } from "vitest";
import {
  dayMonth,
  daysAgo,
  defaultCloseDate,
  driveTitle,
  parseDateInput,
  pinState,
  possibleDuplicates,
  reminderMessage,
  chunk,
  roundNames,
  seasonOf,
  toDateInput,
} from "./admin";

describe("driveTitle", () => {
  const amazon = { name: "Amazon" };

  it("joins company, year and roles", () => {
    expect(
      driveTitle({
        company: amazon,
        year: 2025,
        sequence: 1,
        roles: ["SDE intern"],
      }),
    ).toBe("Amazon · 2025 · SDE intern");
    expect(
      driveTitle({
        company: amazon,
        year: 2025,
        sequence: 1,
        roles: ["SDE intern", "SDE I"],
      }),
    ).toBe("Amazon · 2025 · SDE intern, SDE I");
  });

  it("marks a second visit in the same year", () => {
    expect(
      driveTitle({ company: amazon, year: 2025, sequence: 2, roles: [] }),
    ).toBe("Amazon · 2025 · B");
  });
});

describe("dates", () => {
  const now = new Date("2025-10-17T10:00:00Z");

  it("says how many days ago", () => {
    expect(daysAgo(new Date("2025-10-17T01:00:00Z"), now)).toBe("Today");
    expect(daysAgo(new Date("2025-10-16T23:00:00Z"), now)).toBe("Yesterday");
    expect(daysAgo(new Date("2025-10-14T12:00:00Z"), now)).toBe("3 days");
    expect(daysAgo(new Date("2025-08-20T12:00:00Z"), now)).toBe("20 Aug");
  });

  it("formats day and month", () => {
    expect(dayMonth(new Date("2025-10-22T00:00:00Z"))).toBe("22 Oct");
  });

  it("finds the placement season", () => {
    expect(seasonOf(now).label).toBe("2025–26");
    expect(seasonOf(new Date("2026-03-01T00:00:00Z")).label).toBe("2025–26");
    expect(seasonOf(new Date("2026-07-01T00:00:00Z")).label).toBe("2026–27");
  });
});

describe("new drive form", () => {
  it("names rounds and numbers repeated types", () => {
    expect(roundNames(["OA", "TECHNICAL", "HR"])).toEqual([
      "Online assessment",
      "Technical interview",
      "HR interview",
    ]);
    expect(roundNames(["OA", "TECHNICAL", "TECHNICAL"])).toEqual([
      "Online assessment",
      "Technical interview 1",
      "Technical interview 2",
    ]);
  });

  it("closes the window 14 days after the last round", () => {
    expect(
      defaultCloseDate([
        new Date("2025-08-14T00:00:00Z"),
        null,
        new Date("2025-08-28T00:00:00Z"),
      ]),
    ).toEqual(new Date("2025-09-11T00:00:00Z"));
    expect(defaultCloseDate([null])).toBeNull();
  });

  it("reads and writes date inputs", () => {
    expect(parseDateInput("2025-08-14")).toEqual(
      new Date("2025-08-14T00:00:00Z"),
    );
    expect(parseDateInput("14 Aug 2025")).toBeNull();
    expect(parseDateInput("")).toBeNull();
    expect(toDateInput(new Date("2025-08-14T00:00:00Z"))).toBe("2025-08-14");
    expect(toDateInput(null)).toBe("");
  });
});

describe("pinState", () => {
  const now = new Date("2025-08-20T12:00:00Z");
  const active = {
    status: "OPEN",
    submissionPin: "482915",
    pinEnabled: true,
    closesAt: null,
  } as const;

  it("names each state", () => {
    expect(pinState({ ...active, submissionPin: null }, now)).toBe("No PIN");
    expect(pinState(active, now)).toBe("Active");
    expect(pinState({ ...active, pinEnabled: false }, now)).toBe("Off");
    expect(pinState({ ...active, status: "CLOSED" }, now)).toBe("Expired");
    expect(
      pinState({ ...active, closesAt: new Date("2025-08-01T00:00:00Z") }, now),
    ).toBe("Expired");
  });
});

describe("possibleDuplicates", () => {
  it("flags the longer of two similar company names", () => {
    const flags = possibleDuplicates([
      { id: "a", name: "Amazon", aliases: ["AMZN"] },
      { id: "b", name: "Amazon Web Services", aliases: ["AWS"] },
      { id: "c", name: "Deloitte", aliases: [] },
      { id: "d", name: "Deloitte USI", aliases: [] },
      { id: "e", name: "Goldman Sachs", aliases: ["GS"] },
      { id: "f", name: "GS Group", aliases: ["GS"] },
      { id: "g", name: "Microsoft", aliases: [] },
    ]);
    expect(flags.get("b")).toBe("Amazon");
    expect(flags.get("d")).toBe("Deloitte");
    expect(flags.get("e")).toBe("GS Group");
    expect(flags.has("a")).toBe(false);
    expect(flags.has("g")).toBe(false);
  });
});

describe("reminder emails", () => {
  it("builds the message with the PIN and close date when given", () => {
    const m = reminderMessage({
      drive: "Amazon 2025 SDE intern",
      round: "Online assessment",
      site: "https://qb.example",
      pin: "482 915",
      until: "30 Sep 2025",
    });
    expect(m.subject).toBe(
      "Reminder: share your Amazon 2025 SDE intern Online assessment questions",
    );
    expect(m.text).toContain("Your drive PIN: 482 915");
    expect(m.text).toContain("Submit here: https://qb.example/submit");
    expect(m.text).toContain("Submissions close on 30 Sep 2025.");
  });

  it("leaves the PIN out when there is none", () => {
    const m = reminderMessage({
      drive: "D",
      round: "R",
      site: "",
      pin: null,
      until: null,
    });
    expect(m.text).not.toContain("PIN");
  });

  it("splits recipients into BCC batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 50)).toEqual([]);
  });
});
