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
