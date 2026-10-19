import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { driveStatusTag } from "@/components/admin/DriveHeader";
import { Kpi, PageHead, SrOnly, Tag, table } from "@/components/admin/ui";
import {
  getAnalytics,
  seasonLabel,
  seasonYears,
} from "@/server/admin/analytics";
import { requireAdmin } from "@/server/admin/guard";
import { SeasonSelect } from "./SeasonSelect";

export const metadata: Metadata = {
  title: "Analytics and reports · Admin · Placement Question Bank",
};

const intro =
  "How the question bank is filling up this season, and the reports the CDC sends after each drive.";

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

// A12 Analytics and reports. Every number comes from real rows; there are
// no view counts (CLAUDE.md 2a.4) and reports are CSV only (2a.9).
export default function AnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead
            eyebrow="Insights"
            title="Analytics and reports"
            intro={intro}
          />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <Analytics searchParams={searchParams} />
    </Suspense>
  );
}

async function Analytics({
  searchParams,
}: {
  searchParams: PageProps<"/admin/analytics">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const years = await seasonYears();
  const asked = Number(params.season);
  const year = years.includes(asked)
    ? asked
    : (years[0] ?? new Date().getUTCFullYear());
  const a = await getAnalytics(year);
  const max = Math.max(1, ...a.perDrive.map((d) => d.n));
  const stalled = a.perDrive.filter((d) => d.n === 0 && d.noPin);

  return (
    <>
      <PageHead
        eyebrow="Insights"
        title="Analytics and reports"
        intro={intro}
        actions={
          years.length > 0 && (
            <SeasonSelect
              years={years.map((y) => ({ year: y, label: seasonLabel(y) }))}
              current={year}
            />
          )
        }
      />
      <div className="flex flex-col gap-10 px-5 pt-7 pb-12 sm:px-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-6">
          <Kpi
            value={`${a.drivesWithQuestions} of ${a.drives}`}
            label="Drives with questions"
            sub={`${pct(a.drivesWithQuestions, a.drives)}% coverage`}
          />
          <Kpi
            value={a.submissions}
            label="Submissions"
            sub={`${pct(a.withPin, a.submissions)}% entered with a PIN`}
          />
          <Kpi
            value={a.published}
            label="Questions published"
            sub={`From ${a.approved} approved, after merging`}
          />
          <Kpi
            value={
              a.medianDays === null
                ? "–"
                : `${a.medianDays < 10 ? a.medianDays.toFixed(1) : Math.round(a.medianDays)} days`
            }
            label="Median time to review"
            sub="Sent to decided"
          />
        </div>

        <section aria-labelledby="sd-h" className="flex flex-col gap-3.5">
          <h2
            id="sd-h"
            className="border-b-2 border-charcoal pb-2 text-xl font-bold"
          >
            Submissions per drive
          </h2>
          {a.perDrive.length === 0 ? (
            <p className="text-ink-3">No drives in this season yet.</p>
          ) : (
            // A list, so screen readers read each drive and its number; the
            // bars are decoration.
            <ul className="flex max-w-205 flex-col gap-2.5">
              {a.perDrive.map((d) => (
                <li
                  key={d.id}
                  className="grid grid-cols-[minmax(0,200px)_1fr_44px] items-center gap-3.5 text-sm"
                >
                  <span className="truncate">{d.label}</span>
                  <span
                    aria-hidden="true"
                    className="relative block h-4.5 bg-grey-band"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-charcoal"
                      style={{ width: `${(d.n / max) * 100}%` }}
                    />
                  </span>
                  <strong className="text-right">
                    {d.n}
                    <SrOnly> submissions</SrOnly>
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {stalled.length > 0 && (
            <p className="text-[13px] text-ink-3">
              {stalled.map((d) => d.label).join(", ")}{" "}
              {stalled.length === 1 ? "has" : "have"} no submissions because{" "}
              {stalled.length === 1 ? "its PIN has" : "their PINs have"} not
              been generated yet.
            </p>
          )}
        </section>

        <section aria-labelledby="rp-h" className="flex flex-col gap-3">
          <h2
            id="rp-h"
            className="border-b-2 border-charcoal pb-2 text-xl font-bold"
          >
            Drive reports
          </h2>
          <p className="text-ink-3">
            One report per drive: rounds, shortlist sizes, submissions,
            questions published and topics covered. It replaces the report the
            CDC writes by hand.
          </p>
          {a.reports.length > 0 && (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th scope="col" className={table.th}>
                      Drive
                    </th>
                    <th scope="col" className={table.th}>
                      Status
                    </th>
                    <th scope="col" className={table.th}>
                      Questions
                    </th>
                    <th scope="col" className={table.th}>
                      <SrOnly>Download</SrOnly>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {a.reports.map((r) => (
                    <tr key={r.id} className={table.row}>
                      <td className={`${table.td} font-bold`}>{r.title}</td>
                      <td className={table.td}>
                        <Tag tone={driveStatusTag[r.status].tone}>
                          {driveStatusTag[r.status].label}
                        </Tag>
                      </td>
                      <td className={table.td}>{r.questions}</td>
                      <td className={`${table.td} text-right`}>
                        <a
                          href={`/admin/analytics/report/${r.id}`}
                          className="btn-secondary min-h-9 px-3"
                          aria-label={`Download the ${r.title} report as CSV`}
                        >
                          CSV
                        </a>
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
