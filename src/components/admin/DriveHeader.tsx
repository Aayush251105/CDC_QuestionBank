import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import type { DriveStatus } from "@/generated/prisma/enums";
import { dayMonth } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import type { DriveHeader as DriveHeaderData } from "@/server/admin/drive";
import { PageHead, TabLink, Tag, type TagTone } from "./ui";

export type DriveTabKey = "overview" | "pin" | "shortlist" | "review";

const TABS: { key: DriveTabKey; label: string; path: string }[] = [
  { key: "overview", label: "Overview", path: "" },
  { key: "pin", label: "PIN", path: "/pin" },
  { key: "shortlist", label: "Shortlist", path: "/shortlist" },
  { key: "review", label: "Review", path: "/review" },
];

export const driveStatusTag: Record<
  DriveStatus,
  { label: string; tone: TagTone }
> = {
  OPEN: { label: "Open", tone: "good" },
  DRAFT: { label: "Draft", tone: "draft" },
  CLOSED: { label: "Closed", tone: "muted" },
};

// "Internship · Batches 2026, 2027 · Submissions open 14 Aug to 30 Sep 2025"
function driveLine(d: DriveHeaderData) {
  const window =
    d.opensAt && d.closesAt
      ? `Submissions open ${dayMonth(d.opensAt)} to ${fullDate(d.closesAt)}`
      : d.opensAt
        ? `Submissions open from ${fullDate(d.opensAt)}`
        : d.closesAt
          ? `Submissions close on ${fullDate(d.closesAt)}`
          : "No submission window set";
  return [d.season, d.eligibility && `Batches ${d.eligibility}`, window]
    .filter(Boolean)
    .join(" · ");
}

// Title, status, window and the Overview / PIN / Shortlist / Review tabs
// shared by every drive page (A04 to A07).
export function DriveHeader({
  drive,
  tab,
  actions,
  crumbs = [],
}: {
  drive: DriveHeaderData;
  tab: DriveTabKey;
  actions?: ReactNode;
  crumbs?: string[]; // after the drive, e.g. ["PIN"]
}) {
  const base = `/admin/drives/${drive.id}`;
  const status = driveStatusTag[drive.status];
  const short = drive.title.replace(/ · /g, " ");
  const current = TABS.find((t) => t.key === tab)!;

  // Drives / Amazon 2025 SDE intern / PIN / ...; the last item is the page.
  const items: Crumb[] = [{ label: "Drives", href: "/admin/drives" }];
  items.push(
    tab === "overview" && crumbs.length === 0
      ? { label: short }
      : { label: short, href: base },
  );
  if (tab !== "overview") {
    items.push({
      label: current.label,
      href: crumbs.length ? `${base}${current.path}` : undefined,
    });
  }
  for (const label of crumbs) items.push({ label });

  return (
    <PageHead
      crumbs={<Breadcrumbs items={items} />}
      title={
        <span className="flex flex-wrap items-center gap-3">
          {drive.title}
          <Tag tone={status.tone}>{status.label}</Tag>
        </span>
      }
      intro={driveLine(drive)}
      actions={actions}
      tabs={
        <nav aria-label="Drive sections" className="flex flex-wrap">
          {TABS.map((t) => (
            <TabLink
              key={t.key}
              href={`${base}${t.path}`}
              selected={t.key === tab}
            >
              {t.label}
              {t.key === "review" && drive.pending > 0 && (
                <span className="ml-2 min-w-6 bg-crimson px-1.75 py-px text-center text-xs font-bold text-white">
                  {drive.pending}
                </span>
              )}
            </TabLink>
          ))}
        </nav>
      }
    />
  );
}
