import { describe, expect, it } from "vitest";
import { AUDIT_GROUPS, auditSentence, auditTag, auditWhen } from "./audit";

describe("audit log labels", () => {
  it("names known actions and falls back for others", () => {
    expect(auditTag("pin_generate")).toEqual({
      tag: "PIN generated",
      tone: "dark",
    });
    expect(auditTag("something_new")).toEqual({
      tag: "something new",
      tone: "draft",
    });
  });

  it("builds an activity sentence", () => {
    expect(
      auditSentence({
        action: "shortlist_upload",
        adminName: "CDC Admin",
        adminRole: "ADMIN",
        summary: "round2.csv",
        detail: "38 rows, 1 unmatched",
      }),
    ).toBe(
      "CDC Admin (admin) uploaded a shortlist: round2.csv. 38 rows, 1 unmatched.",
    );
  });

  it("says when in India time", () => {
    const now = new Date("2025-10-17T06:00:00Z"); // 11:30 IST
    expect(auditWhen(new Date("2025-10-17T03:42:00Z"), now)).toBe(
      "Today, 9:12",
    );
    expect(auditWhen(new Date("2025-10-16T13:10:00Z"), now)).toBe(
      "Yesterday, 18:40",
    );
    expect(auditWhen(new Date("2025-08-20T05:35:00Z"), now)).toBe(
      "20 Aug, 11:05",
    );
  });
});

describe("audit groups", () => {
  it("puts every labelled action in exactly one group", () => {
    const all = Object.values(AUDIT_GROUPS).flatMap((g) => [...g.actions]);
    expect(new Set(all).size).toBe(all.length);
    for (const action of all)
      expect(auditTag(action).tag).not.toBe(action.replace(/_/g, " "));
  });
});
