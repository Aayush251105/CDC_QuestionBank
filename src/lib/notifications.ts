// In-app notifications (CLAUDE.md 2a.12). In-app only, never email.

export const NOTIFICATION_KINDS = [
  "REVIEWED",
  "FOLLOWED_COMPANY",
  "DRAFT_REMINDER",
  "ANNOUNCEMENT",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// Small label above each item on the notifications page.
export const notificationKindLabel: Record<NotificationKind, string> = {
  REVIEWED: "Submission",
  FOLLOWED_COMPANY: "Company you follow",
  DRAFT_REMINDER: "Draft",
  ANNOUNCEMENT: "From the CDC",
};

export function kindLabel(kind: string): string {
  return (NOTIFICATION_KINDS as readonly string[]).includes(kind)
    ? notificationKindLabel[kind as NotificationKind]
    : "Notice";
}

// Sent when the CDC finishes a review. It takes no outcome on purpose: the
// wording is the same whether questions were published or not (2a.2).
export function reviewedMessage(s: {
  company: string;
  drive: string; // "2025" or "2025 · B"
  round: string | null;
}): string {
  return `Your ${s.company} ${s.drive} ${s.round ?? "round"} submission has been reviewed.`;
}

// Only links inside the site are followed from a notification.
export function safeLink(link: string | null): string | null {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : null;
}
