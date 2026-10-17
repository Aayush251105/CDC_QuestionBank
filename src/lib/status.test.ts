import { describe, expect, it } from "vitest";
import { studentStatus } from "./status";

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
