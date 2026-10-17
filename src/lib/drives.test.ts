import { describe, expect, it } from "vitest";
import {
  driveIsFor,
  driveLabel,
  driveSegment,
  parseDriveSegment,
  pickRole,
  roundIsFor,
  roundRoles,
  rolesOf,
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

describe("role filter", () => {
  const slug = (r: string) => r.toLowerCase().replace(/\s+/g, "-");
  const drives = [
    { roles: ["SDE intern", "SDE I"] },
    { roles: ["SDE I", "Data analyst"] },
  ];

  it("lists each role once, in order", () => {
    expect(rolesOf(drives)).toEqual(["SDE intern", "SDE I", "Data analyst"]);
  });

  it("picks the role from the URL, else the first", () => {
    const roles = rolesOf(drives);
    expect(pickRole(roles, "sde-i", slug)).toBe("SDE I");
    expect(pickRole(roles, "nope", slug)).toBe("SDE intern");
    expect(pickRole(roles, undefined, slug)).toBe("SDE intern");
    expect(pickRole([], "sde-i", slug)).toBeNull();
  });

  it("keeps shared rounds for every role and role rounds for theirs", () => {
    expect(roundIsFor({ roles: [] }, "SDE I")).toBe(true);
    expect(roundIsFor({ roles: ["SDE I"] }, "SDE I")).toBe(true);
    expect(roundIsFor({ roles: ["SDE intern"] }, "SDE I")).toBe(false);
    expect(driveIsFor(drives[0], "Data analyst")).toBe(false);
    expect(driveIsFor(drives[1], "Data analyst")).toBe(true);
  });
});
