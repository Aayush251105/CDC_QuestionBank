import { describe, expect, it } from "vitest";
import { dayMonth, daysAgo, driveTitle, pinState, seasonOf } from "./admin";

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
