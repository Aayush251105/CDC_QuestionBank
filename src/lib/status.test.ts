import { describe, expect, it } from "vitest";
import { studentStatus, tabOf } from "./status";

describe("studentStatus", () => {
  it("never reveals the review outcome", () => {
    expect(studentStatus("PUBLISHED")).toBe("Reviewed");
    expect(studentStatus("NOT_PUBLISHED")).toBe("Reviewed");
  });

  it("maps the other statuses", () => {
    expect(studentStatus("DRAFT")).toBe("Draft");
    expect(studentStatus("PROCESSING")).toBe("Processing");
    expect(studentStatus("PENDING_REVIEW")).toBe("In review");
    expect(studentStatus("WITHDRAWN")).toBe("Withdrawn");
  });
});

describe("tabOf", () => {
  it("puts published and not published together under Reviewed", () => {
    expect(tabOf("DRAFT")).toBe("draft");
    expect(tabOf("PENDING_REVIEW")).toBe("in-review");
    expect(tabOf("PUBLISHED")).toBe("reviewed");
    expect(tabOf("NOT_PUBLISHED")).toBe("reviewed");
    expect(tabOf("WITHDRAWN")).toBeNull();
  });
});
