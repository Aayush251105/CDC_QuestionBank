import { describe, expect, it } from "vitest";
import {
  formatPin,
  generatePin,
  isPinFormat,
  normalisePin,
  pinOpensDrive,
} from "./pin";

describe("PIN format", () => {
  it("drops spaces and hyphens", () => {
    expect(normalisePin(" 482 915 ")).toBe("482915");
    expect(normalisePin("482-915")).toBe("482915");
  });

  it("accepts exactly 6 digits", () => {
    expect(isPinFormat("482915")).toBe(true);
    expect(isPinFormat("004211")).toBe(true);
    expect(isPinFormat("48291")).toBe(false);
    expect(isPinFormat("4829150")).toBe(false);
    expect(isPinFormat("AMZ915")).toBe(false);
  });

  it("formats as two groups of three", () => {
    expect(formatPin("482915")).toBe("482 915");
  });

  it("generates valid PINs", () => {
    for (let i = 0; i < 200; i++) expect(isPinFormat(generatePin())).toBe(true);
  });
});

describe("pinOpensDrive", () => {
  const open = {
    status: "OPEN",
    pinEnabled: true,
    submissionPin: "482915",
  } as const;

  it("works only for an open drive with the PIN switched on", () => {
    expect(pinOpensDrive(open)).toBe(true);
    expect(pinOpensDrive({ ...open, status: "CLOSED" })).toBe(false);
    expect(pinOpensDrive({ ...open, pinEnabled: false })).toBe(false);
    expect(pinOpensDrive({ ...open, submissionPin: null })).toBe(false);
  });
});
