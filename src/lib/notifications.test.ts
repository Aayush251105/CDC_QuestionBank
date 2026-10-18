import { describe, expect, it } from "vitest";
import { kindLabel, reviewedMessage, safeLink } from "./notifications";

describe("reviewedMessage", () => {
  it("is neutral: never says how the review went", () => {
    const m = reviewedMessage({
      company: "Amazon",
      drive: "2025",
      round: "Online assessment",
    });
    expect(m).toBe(
      "Your Amazon 2025 Online assessment submission has been reviewed.",
    );
    expect(m).not.toMatch(/publish|reject|approv|merg|reason|live/i);
  });
});

describe("kindLabel", () => {
  it("labels known kinds and falls back for others", () => {
    expect(kindLabel("ANNOUNCEMENT")).toBe("From the CDC");
    expect(kindLabel("SOMETHING_NEW")).toBe("Notice");
  });
});

describe("safeLink", () => {
  it("keeps only links inside the site", () => {
    expect(safeLink("/me/submissions/abc")).toBe("/me/submissions/abc");
    expect(safeLink("https://evil.example")).toBeNull();
    expect(safeLink("//evil.example")).toBeNull();
    expect(safeLink(null)).toBeNull();
  });
});
