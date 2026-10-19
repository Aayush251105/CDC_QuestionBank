import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import {
  Kpi,
  PageHead,
  pinTone,
  SrOnly,
  Tag,
  table,
} from "@/components/admin/ui";
import { dayMonth } from "@/lib/admin";
import { greeting, plural } from "@/lib/labels";
import { getDashboard } from "@/server/admin/dashboard";
import { requireAdmin } from "@/server/admin/guard";

// A01 Dashboard: pending reviews by drive, drives that need a PIN or a
// shortlist, and this week in numbers.
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const alertColour = {
  crimson: "text-crimson",
  amber: "text-pending-fg",
  grey: "text-ink-2",
};

async function Dashboard() {
  const user = await requireAdmin();
  const d = await getDashboard();
  const firstName = user.name.split(" ")[0];
  const k = d.kpis;

  return (
    <>
      <PageHead
        eyebrow={`Placement season ${d.season}`}
        title={`${greeting()}, ${firstName}`}
        intro={
          k.waiting === 0
            ? "Nothing is waiting for review."
            : `${plural(k.waiting, "submission")} ${k.waiting === 1 ? "is" : "are"} waiting across ${plural(d.queue.length, "drive")}.`
        }
        actions={
          <>
            <Link href="/admin/drives/new" className="btn-secondary">
              New drive
            </Link>
            <Link href="/admin/review" className="btn-primary">
              Start reviewing
            </Link>
          </>
        }
      />
      <div className="flex flex-col gap-9 px-5 pt-7 pb-12 sm:px-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-6">
          <Kpi
            value={k.waiting}
            label="Waiting for review"
            sub={
              k.oldestPending
                ? `Oldest sent ${sentAgo(k.oldestPending)}`
                : "Queue is clear"
            }
          />
          <Kpi
            value={k.weekTotal}
            label="Submissions this week"
            sub={`${k.weekWithPin} entered with a PIN`}
          />
          <Kpi
            value={k.openDrives}
            label="Open drives"
            sub={
              k.openNeedPin
                ? `${k.openNeedPin} still need${k.openNeedPin === 1 ? "s" : ""} a PIN`
                : "All have a PIN"
            }
          />
          <Kpi
            value={k.published}
            label="Questions published"
            sub="This season"
          />
        </div>

        <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <section
            aria-labelledby="pq-h"
            className="flex min-w-0 flex-col gap-2.5"
          >
            <h2 id="pq-h" className="text-xl font-bold">
              Waiting for review
            </h2>
            {d.queue.length === 0 ? (
              <p className="text-ink-3">
                Nothing is waiting. New submissions show up here.
              </p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={table.th}>
                        Drive
                      </th>
                      <th scope="col" className={table.th}>
                        Pending
                      </th>
                      <th scope="col" className={table.th}>
                        Shortlist match
                      </th>
                      <th scope="col" className={table.th}>
                        Oldest
                      </th>
                      <th scope="col" className={table.th}>
                        <SrOnly>Action</SrOnly>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.queue.map((q) => (
                      <tr key={q.driveId} className={table.row}>
                        <td className={table.td}>
                          <Link
                            href={`/admin/drives/${q.driveId}`}
                            className={table.rowLink}
                          >
                            {q.drive}
                          </Link>
                          <div className="text-[13px] text-ink-3">
                            {q.rounds}
                          </div>
                        </td>
                        <td className={`${table.td} text-lg font-bold`}>
                          {q.n}
                        </td>
                        <td className={`${table.td} text-[13px]`}>
                          <span className="flex flex-col items-start gap-1">
                            {q.verified > 0 && (
                              <Tag tone="good">{q.verified} verified</Tag>
                            )}
                            {q.likely > 0 && (
                              <Tag tone="pending">{q.likely} likely</Tag>
                            )}
                            {q.notFound > 0 && (
                              <Tag tone="dark">{q.notFound} not found</Tag>
                            )}
                            {q.n - q.verified - q.likely - q.notFound > 0 && (
                              <Tag tone="draft">
                                {q.n - q.verified - q.likely - q.notFound} not
                                checked
                              </Tag>
                            )}
                          </span>
                        </td>
                        <td className={`${table.td} text-sm text-ink-3`}>
                          {q.age}
                        </td>
                        <td className={`${table.td} text-right`}>
                          <Link
                            href={`/admin/drives/${q.driveId}/review`}
                            className="font-bold"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="att-h" className="flex flex-col">
            <h2 id="att-h" className="mb-2.5 text-xl font-bold">
              Needs attention
            </h2>
            {d.alerts.length === 0 && (
              <p className="border-t border-line py-3.5 text-ink-3">
                Nothing needs attention.
              </p>
            )}
            {d.alerts.map((a, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 border-t border-line py-3.5"
              >
                <span
                  className={`text-[11px] font-bold tracking-[0.12em] uppercase ${alertColour[a.tone]}`}
                >
                  {a.kind}
                </span>
                <span className="text-[15px]">
                  <strong>{a.title}</strong> {a.body}
                </span>
                <Link href={a.href} className="text-sm font-bold">
                  {a.action}
                </Link>
              </div>
            ))}
          </section>
        </div>

        <section aria-labelledby="up-h" className="flex flex-col gap-2.5">
          <h2 id="up-h" className="text-xl font-bold">
            Coming up
          </h2>
          {d.comingUp.length === 0 ? (
            <p className="text-ink-3">No rounds are scheduled from today.</p>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th scope="col" className={table.th}>
                      Date
                    </th>
                    <th scope="col" className={table.th}>
                      Drive
                    </th>
                    <th scope="col" className={table.th}>
                      Round
                    </th>
                    <th scope="col" className={table.th}>
                      PIN
                    </th>
                    <th scope="col" className={table.th}>
                      Shortlist
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.comingUp.map((u) => (
                    <tr key={u.id} className={table.row}>
                      <td className={`${table.td} font-bold whitespace-nowrap`}>
                        {dayMonth(u.date)}
                      </td>
                      <td className={table.td}>
                        <Link
                          href={`/admin/drives/${u.driveId}`}
                          className={table.rowLink}
                        >
                          {u.drive}
                        </Link>
                      </td>
                      <td className={table.td}>{u.round}</td>
                      <td className={table.td}>
                        <Tag tone={pinTone[u.pin]}>{u.pin}</Tag>
                      </td>
                      <td className={`${table.td} text-sm text-ink-3`}>
                        {u.shortlist}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// "3 days" -> "3 days ago"; "Today" -> "today"; "20 Aug" -> "on 20 Aug"
function sentAgo(age: string) {
  if (age === "Today" || age === "Yesterday") return age.toLowerCase();
  return age.endsWith("days") ? `${age} ago` : `on ${age}`;
}

function DashboardSkeleton() {
  return (
    <>
      <PageHead eyebrow="Placement season" title="Dashboard" />
      <div className="px-5 pt-7 pb-12 sm:px-8">
        <SkeletonRows rows={6} />
      </div>
    </>
  );
}
