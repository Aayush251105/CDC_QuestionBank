import type { SubmissionStatus } from "@/generated/prisma/enums";
import { studentStatus, type StudentStatus } from "@/lib/status";

const styles: Record<StudentStatus, string> = {
  Draft: "border border-line-strong text-ink-2",
  Processing: "bg-charcoal text-white",
  "In review": "bg-peach text-pending-fg",
  Reviewed: "bg-unpublished-bg text-ink-2",
  Withdrawn: "border border-line text-ink-3",
};

// Takes the DB status and shows only the student-safe label.
export function StatusTag({ status }: { status: SubmissionStatus }) {
  const label = studentStatus(status);
  return (
    <span
      className={`inline-block px-2.5 py-0.75 text-xs font-bold tracking-[0.06em] whitespace-nowrap uppercase ${styles[label]}`}
    >
      {label}
    </span>
  );
}
