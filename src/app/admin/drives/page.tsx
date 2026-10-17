import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import {
  PageHead,
  pinTone,
  SrOnly,
  TabLink,
  Tag,
  table,
  type TagTone,
} from "@/components/admin/ui";
import type { DriveStatus } from "@/generated/prisma/enums";
import { daysAgo } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import {
  getDriveList,
  getDriveRequests,
  parseDriveTab,
  type DriveTab,
} from "@/server/admin/drives";
import { requireAdmin } from "@/server/admin/guard";
import { DeclineRequest } from "./DeclineRequest";
import { DriveFilters } from "./DriveFilters";

export const metadata: Metadata = {
  title: "Drives · Admin · Placement Question Bank",
};

const TABS: { tab: DriveTab; label: string }[] = [
  { tab: "open", label: "Open" },
  { tab: "draft", label: "Draft" },
  { tab: "closed", label: "Closed" },
  { tab: "all", label: "All" },
  { tab: "requests", label: "Requests" },
];

const statusTag: Record<DriveStatus, { label: string; tone: TagTone }> = {
  OPEN: { label: "Open", tone: "good" },
  DRAFT: { label: "Draft", tone: "draft" },
  CLOSED: { label: "Closed", tone: "muted" },
};

// A02 Drives: all drives by status, plus drive requests sent by students.
// Tab, company filter and year live in the URL.
export default function DrivesPage({
  searchParams,
}: PageProps<"/admin/drives">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead eyebrow="Drives" title="Company drives" />
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <Drives searchParams={searchParams} />
    </Suspense>
  );
}

async function Drives({
  searchParams,
}: {
  searchParams: PageProps<"/admin/drives">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";
  const tab = parseDriveTab(one(params.tab));
  const q = one(params.q).trim();
  const year = Number(one(params.year)) || null;

  const [list, requests] = await Promise.all([
    getDriveList({ tab, q, year }),
    tab === "requests" ? getDriveRequests() : Promise.resolve([]),
  ]);

  // Switching tabs keeps the company and year filters.
  const tabHref = (t: DriveTab) => {
    const next = new URLSearchParams();
    if (t !== "open") next.set("tab", t);
    if (q) next.set("q", q);
    if (year) next.set("year", String(year));
    const query = next.toString();
    return query ? `/admin/drives?${query}` : "/admin/drives";
  };

  return (
    <>
      <PageHead
        eyebrow="Drives"
        title="Company drives"
        intro="One drive is one company's hiring process in one year. Rounds, the PIN, the shortlist and submissions all belong to a drive."
        actions={
          <Link href="/admin/drives/new" className="btn-primary">
            New drive
          </Link>
        }
        tabs={
          <nav aria-label="Drive status" className="flex flex-wrap">
            {TABS.map((t) => (
              <TabLink
                key={t.tab}
                href={tabHref(t.tab)}
                selected={t.tab === tab}
              >
                {t.label}
                <span className="ml-1.5 font-medium text-ink-3">
                  {list.tabCounts[t.tab]}
                </span>
              </TabLink>
            ))}
          </nav>
        }
      />
      <div className="flex flex-col gap-5 px-5 pt-6 pb-12 sm:px-8">
        {tab === "requests" ? (
          <>
            <p className="text-ink-3">
              Students ask for a drive when theirs is missing. Their submissions
              wait until you add the drive or decline.
            </p>
            {requests.length === 0 ? (
              <p className="text-ink-3">No drive requests right now.</p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={table.th}>
                        Company and role
                      </th>
                      <th scope="col" className={table.th}>
                        Test date
                      </th>
                      <th scope="col" className={table.th}>
                        Asked by
                      </th>
                      <th scope="col" className={table.th}>
                        Received
                      </th>
                      <th scope="col" className={table.th}>
                        <SrOnly>Actions</SrOnly>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className={table.row}>
                        <td className={`${table.td} font-bold`}>
                          {r.company}
                          <div className="text-[13px] font-normal text-ink-3">
                            {r.roles}
                          </div>
                        </td>
                        <td className={table.td}>
                          {r.testDate ? fullDate(r.testDate) : "Not given"}
                        </td>
                        <td className={table.td}>{r.askedBy}</td>
                        <td className={`${table.td} text-sm text-ink-3`}>
                          {receivedLabel(daysAgo(r.received))}
                        </td>
                        <td
                          className={`${table.td} text-right whitespace-nowrap`}
                        >
                          <span className="inline-flex gap-2">
                            <Link
                              href={`/admin/drives/new?request=${r.id}`}
                              className="btn-primary min-h-9 px-3"
                            >
                              Create drive
                            </Link>
                          </span>
                          <DeclineRequest
                            driveId={r.id}
                            company={r.company}
                            submissions={r.submissions}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <DriveFilters years={list.years} />
            {list.rows.length === 0 ? (
              <p className="text-ink-3">No drives in this view.</p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={table.th}>
                        Drive
                      </th>
                      <th scope="col" className={table.th}>
                        Rounds
                      </th>
                      <th scope="col" className={table.th}>
                        PIN
                      </th>
                      <th scope="col" className={table.th}>
                        Shortlist
                      </th>
                      <th scope="col" className={table.th}>
                        Submissions
                      </th>
                      <th scope="col" className={table.th}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.rows.map((r) => (
                      <tr key={r.id} className={table.row}>
                        <td className={table.td}>
                          <Link
                            href={`/admin/drives/${r.id}`}
                            className={table.rowLink}
                          >
                            {r.title}
                          </Link>
                          {r.sub && (
                            <div className="text-[13px] text-ink-3">
                              {r.sub}
                            </div>
                          )}
                        </td>
                        <td className={table.td}>{r.rounds}</td>
                        <td className={table.td}>
                          <Tag tone={pinTone[r.pin]}>{r.pin}</Tag>
                        </td>
                        <td className={`${table.td} text-sm text-ink-3`}>
                          {r.shortlist}
                        </td>
                        <td className={table.td}>
                          <strong>{r.submissions}</strong>{" "}
                          {r.pending > 0 && (
                            <span className="text-[13px] text-ink-3">
                              {r.pending} pending
                            </span>
                          )}
                        </td>
                        <td className={table.td}>
                          <Tag tone={statusTag[r.status].tone}>
                            {statusTag[r.status].label}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// "Today", "Yesterday", "2 days ago", "20 Aug"
function receivedLabel(age: string) {
  return age.endsWith("days") ? `${age} ago` : age;
}
