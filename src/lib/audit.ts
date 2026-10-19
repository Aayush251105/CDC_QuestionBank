// Audit log action names (ReviewAction.action) and how the admin side shows
// them: a tag on A14 Audit log and a sentence in A04 Recent activity.

export type AuditTone = "draft" | "dark" | "pending" | "good" | "muted";

const ACTIONS: Record<string, { tag: string; tone: AuditTone; verb: string }> =
  {
    approved: { tag: "Approved", tone: "good", verb: "approved" },
    merged: { tag: "Merged", tone: "pending", verb: "merged" },
    rejected: { tag: "Rejected", tone: "muted", verb: "rejected" },
    unpublish: { tag: "Unpublished", tone: "muted", verb: "unpublished" },
    republish: { tag: "Republished", tone: "good", verb: "republished" },
    question_edit: { tag: "Edited", tone: "draft", verb: "edited" },
    company_create: {
      tag: "Company added",
      tone: "good",
      verb: "added the company",
    },
    company_edit: {
      tag: "Company edited",
      tone: "draft",
      verb: "edited the company",
    },
    company_merge: {
      tag: "Company merged",
      tone: "pending",
      verb: "merged the company",
    },
    drive_create: {
      tag: "Drive created",
      tone: "dark",
      verb: "created the drive",
    },
    drive_edit: {
      tag: "Drive edited",
      tone: "draft",
      verb: "edited the drive",
    },
    drive_open: { tag: "Drive opened", tone: "good", verb: "opened the drive" },
    drive_close: {
      tag: "Drive closed",
      tone: "muted",
      verb: "closed the drive",
    },
    request_attach: {
      tag: "Request",
      tone: "draft",
      verb: "turned a drive request into",
    },
    request_decline: {
      tag: "Request",
      tone: "muted",
      verb: "declined a drive request for",
    },
    pin_generate: {
      tag: "PIN generated",
      tone: "dark",
      verb: "generated the PIN for",
    },
    pin_regenerate: {
      tag: "PIN regenerated",
      tone: "pending",
      verb: "regenerated the PIN for",
    },
    pin_view: { tag: "PIN viewed", tone: "draft", verb: "copied the PIN for" },
    pin_off: {
      tag: "PIN off",
      tone: "muted",
      verb: "switched off the PIN for",
    },
    pin_on: { tag: "PIN on", tone: "good", verb: "switched on the PIN for" },
    reminder_email: {
      tag: "Reminder sent",
      tone: "draft",
      verb: "emailed a reminder for",
    },
    shortlist_upload: {
      tag: "Shortlist",
      tone: "draft",
      verb: "uploaded a shortlist:",
    },
    role_change: { tag: "Role change", tone: "dark", verb: "changed a role:" },
    block: { tag: "Blocked", tone: "dark", verb: "blocked" },
    unblock: { tag: "Unblocked", tone: "good", verb: "unblocked" },
    setting_change: {
      tag: "Setting",
      tone: "draft",
      verb: "changed a setting:",
    },
  };

export function auditTag(action: string): { tag: string; tone: AuditTone } {
  const known = ACTIONS[action];
  return known
    ? { tag: known.tag, tone: known.tone }
    : { tag: action.replace(/_/g, " "), tone: "draft" };
}

// "CDC Admin (admin) uploaded a shortlist: deloitte.csv. 1 rows, 0 unmatched."
export function auditSentence(entry: {
  action: string;
  adminName: string;
  adminRole: string;
  summary: string | null;
  detail: string | null;
}): string {
  const who = `${entry.adminName} (${entry.adminRole === "SUPER_ADMIN" ? "super admin" : "admin"})`;
  const verb = ACTIONS[entry.action]?.verb ?? entry.action.replace(/_/g, " ");
  const what = entry.summary ? ` ${entry.summary}` : "";
  const detail = entry.detail ? `. ${entry.detail}` : "";
  return `${who} ${verb}${what}${detail}.`;
}

// "Today, 9:12", "Yesterday, 18:40", "20 Aug, 11:05" in India time
export function auditWhen(date: Date, now: Date = new Date()): string {
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      ...opts,
    }).format(d);
  const day = (d: Date) =>
    fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = fmt(date, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  });
  if (day(date) === day(now)) return `Today, ${time}`;
  if (day(date) === day(new Date(now.getTime() - 86_400_000))) {
    return `Yesterday, ${time}`;
  }
  return `${fmt(date, { day: "numeric", month: "short" })}, ${time}`;
}

// The "Action type" filter on A14.
export const AUDIT_GROUPS = {
  pin: {
    label: "PIN",
    actions: [
      "pin_generate",
      "pin_regenerate",
      "pin_view",
      "pin_off",
      "pin_on",
    ],
  },
  review: {
    label: "Review decisions",
    actions: ["approved", "merged", "rejected"],
  },
  questions: {
    label: "Published questions",
    actions: ["question_edit", "unpublish", "republish"],
  },
  shortlist: {
    label: "Shortlists and reminders",
    actions: ["shortlist_upload", "reminder_email"],
  },
  drives: {
    label: "Drives and requests",
    actions: [
      "drive_create",
      "drive_edit",
      "drive_open",
      "drive_close",
      "request_attach",
      "request_decline",
    ],
  },
  companies: {
    label: "Companies",
    actions: ["company_create", "company_edit", "company_merge"],
  },
  people: {
    label: "Students, roles and settings",
    actions: ["block", "unblock", "role_change", "setting_change"],
  },
} as const;

export type AuditGroup = keyof typeof AUDIT_GROUPS;
