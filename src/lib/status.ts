import type { SubmissionStatus } from "@/generated/prisma/enums";

// The one place that turns a submission's DB status into what the student
// sees (CLAUDE.md 2a.2): never whether it was published, rejected or merged.
export type StudentStatus =
  "Draft" | "Processing" | "In review" | "Reviewed" | "Withdrawn";

export function studentStatus(status: SubmissionStatus): StudentStatus {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PROCESSING":
      return "Processing";
    case "PENDING_REVIEW":
      return "In review";
    case "PUBLISHED":
    case "NOT_PUBLISHED":
      return "Reviewed";
    case "WITHDRAWN":
      return "Withdrawn";
  }
}

// Tabs on My submissions (page 10), in the URL as ?status=in-review.
// Withdrawn submissions are not listed.
export type SubmissionTab = "draft" | "in-review" | "reviewed";

export const SUBMISSION_TABS: { key: SubmissionTab; label: StudentStatus }[] = [
  { key: "draft", label: "Draft" },
  { key: "in-review", label: "In review" },
  { key: "reviewed", label: "Reviewed" },
];

export function tabOf(status: SubmissionStatus): SubmissionTab | null {
  switch (studentStatus(status)) {
    case "Draft":
      return "draft";
    case "Processing":
    case "In review":
      return "in-review";
    case "Reviewed":
      return "reviewed";
    case "Withdrawn":
      return null;
  }
}
