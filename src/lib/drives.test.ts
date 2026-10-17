import { describe, expect, it } from "vitest";
import {
  driveLabel,
  driveSegment,
  parseDriveSegment,
  roundRoles,
} from "./drives";

describe("driveLabel", () => {
  it("shows just the year for a single visit", () => {
    expect(driveLabel(2025, 1, 1)).toBe("2025");
  });
  it("adds A, B for a second visit", () => {
    expect(driveLabel(2025, 1, 2)).toBe("2025 · A");
    expect(driveLabel(2025, 2, 2)).toBe("2025 · B");
  });
});

describe("driveSegment / parseDriveSegment", () => {
  it("keeps the first visit as the plain year", () => {
    expect(driveSegment(2025, 1)).toBe("2025");
    expect(driveSegment(2025, 2)).toBe("2025-b");
  });
  it("round-trips and rejects junk", () => {
    expect(parseDriveSegment("2025")).toEqual({ year: 2025, sequence: 1 });
    expect(parseDriveSegment("2025-b")).toEqual({ year: 2025, sequence: 2 });
    expect(parseDriveSegment("2025-B")).toEqual({ year: 2025, sequence: 2 });
    expect(parseDriveSegment("2025-a")).toBeNull();
    expect(parseDriveSegment("20x5")).toBeNull();
    expect(parseDriveSegment("2025-bb")).toBeNull();
  });
});

describe("roundRoles", () => {
  it("falls back to every role in the drive", () => {
    expect(roundRoles([], ["SDE intern", "SDE I"])).toEqual([
      "SDE intern",
      "SDE I",
    ]);
    expect(roundRoles(["SDE I"], ["SDE intern", "SDE I"])).toEqual(["SDE I"]);
  });
});
