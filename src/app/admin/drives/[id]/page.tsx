import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveHeader } from "@/components/admin/DriveHeader";
import { PageHead, Tag, table, type TagTone } from "@/components/admin/ui";
import { dayMonth } from "@/lib/admin";
import { auditSentence, auditWhen } from "@/lib/audit";
import { plural } from "@/lib/labels";
import { formatPin } from "@/lib/pin";
import { getDriveHeader, getDriveOverview } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { DriveStatusButton } from "./DriveStatusButton";

export const metadata: Metadata = {
  title: "Drive · Admin · Placement Question Bank",
};

// A04 Drive detail (Overview tab): PIN, shortlist and review at a glance,
// the rounds, submissions by check and recent activity.
export default function DrivePage({ params }: PageProps<"/admin/drives/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Drive" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <Overview params={params} />
    </Suspense>
  );
}

const card = "flex flex-col gap-1 border-t-4 pt-3.5 text-charcoal no-underline";
const cardLink = "text-sm font-bold text-crimson";

const checkRows: {
  key: "verified" | "likely" | "notFound" | "noPin";
  label: string;
  tone: TagTone;
  bar: string;
}[] = [
  { key: "verified", label: "Verified", tone: "good", bar: "bg-published-fg" },
  { key: "likely", label: "Likely", tone: "pending", bar: "bg-amber" },
  { key: "notFound", label: "Not found", tone: "dark", bar: "bg-charcoal" },
  { key: "noPin", label: "No PIN", tone: "draft", bar: "bg-line-strong" },
];

async function Overview({
  params,
}: {
  params: PageProps<"/admin/drives/[id]">["params"];
}) {
  await requireAdmin();
  const { id } = await params;
  const drive = await getDriveHeader(id);
  const o = await getDriveOverview(id, drive.submissionPin);
  const base = `/admin/drives/${id}`;
  const c = o.checks;

  return (
    <>
      <DriveHeader
        drive={drive}
        tab="overview"
        actions={
          <>
            <Link href={`${base}/edit`} className="btn-secondary">
              Edit drive
            </Link>
            <DriveStatusButton driveId={id} status={drive.status} />
            <Link href={`${base}/review`} className="btn-primary">
              Review batch
            </Link>
          </>
        }
      />
      <div className="flex flex-col gap-9 px-5 pt-7 pb-12 sm:px-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-6">
          <Link href={`${base}/pin`} className={`${card} border-charcoal`}>
            <span className="lbl">PIN</span>
            {drive.submissionPin ? (
              <span className="font-mono text-[26px] font-medium tracking-[0.12em]">
                {formatPin(drive.submissionPin)}
              </span>
            ) : (
              <span className="text-[26px] font-bold">No PIN yet</span>
            )}
            <span className="text-sm text-ink-3">
              {drive.submissionPin
                ? `${drive.pin}${drive.pin === "Active" && drive.closesAt ? ` until ${dayMonth(drive.closesAt)}` : ""} · used by ${plural(o.pinUsers, "student")}`
                : drive.requirePin
                  ? "Students cannot submit until it has one"
                  : "This drive does not require a PIN"}
            </span>
            <span className={cardLink}>
              {drive.submissionPin ? "Manage PIN" : "Generate PIN"}
            </span>
          </Link>
          <Link
            href={`${base}/shortlist`}
            className={`${card} border-charcoal`}
          >
            <span className="lbl">Shortlist</span>
            <span className="text-[26px] font-bold">
              {o.shortlist.perRound.length
                ? plural(o.shortlist.students, "student")
                : "Not uploaded"}
            </span>
            <span className="text-sm text-ink-3">
              {o.shortlist.perRound.length
                ? [
                    ...o.shortlist.perRound,
                    o.shortlist.updated &&
                      `updated ${dayMonth(o.shortlist.updated)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Submissions cannot be matched yet"}
            </span>
            <span className={cardLink}>
              {o.shortlist.perRound.length
                ? "Update shortlist"
                : "Upload shortlist"}
            </span>
          </Link>
          <Link href={`${base}/review`} className={`${card} border-crimson`}>
            <span className="lbl">Review</span>
            <span className="text-[26px] font-bold">
              {drive.pending} waiting
            </span>
            <span className="text-sm text-ink-3">
              {o.review.published} published · {o.review.notPublished} not
              published
            </span>
            <span className={cardLink}>Open review batch</span>
          </Link>
        </div>

        <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
          <section
            aria-labelledby="rd-h"
            className="flex min-w-0 flex-col gap-2.5"
          >
            <h2 id="rd-h" className="text-xl font-bold">
              Rounds
            </h2>
            {o.rounds.length === 0 ? (
              <p className="text-ink-3">
                No rounds yet. The drive stays a draft until it has one.
              </p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={table.th}>
                        No.
                      </th>
                      <th scope="col" className={table.th}>
                        Round
                      </th>
                      <th scope="col" className={table.th}>
                        Date
                      </th>
                      <th scope="col" className={table.th}>
                        Shortlisted
                      </th>
                      <th scope="col" className={table.th}>
                        Submissions
                      </th>
                      <th scope="col" className={table.th}>
                        Questions live
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.rounds.map((r) => (
                      <tr key={r.id} className={table.row}>
                        <td className={`${table.td} font-bold text-crimson`}>
                          {String(r.order).padStart(2, "0")}
                        </td>
                        <td className={`${table.td} font-bold`}>
                          {r.name}
                          <div className="text-[13px] font-normal text-ink-3">
                            {[
                              r.platform,
                              r.durationMin && `${r.durationMin} min`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </td>
                        <td className={`${table.td} whitespace-nowrap`}>
                          {r.date ? dayMonth(r.date) : "–"}
                        </td>
                        <td className={table.td}>
                          {r.shortlistUploads[0]
                            ? r.shortlistUploads[0]._count.entries
                            : "Not uploaded"}
                        </td>
                        <td className={table.td}>{r._count.submissions}</td>
                        <td className={table.td}>{r._count.questions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link
              href={`${base}/edit#rounds`}
              className="btn-secondary self-start"
            >
              Add a round
            </Link>
          </section>

          <section
            aria-labelledby="tg-h"
            className="flex flex-col gap-3 bg-grey-band p-5.5"
          >
            <h2 id="tg-h" className="text-lg font-bold">
              {plural(c.total, "submission")} by check
            </h2>
            {checkRows.map((row) => {
              const n = c[row.key];
              const pct = c.total ? Math.round((n / c.total) * 100) : 0;
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[110px_1fr_32px] items-center gap-2.5 text-sm"
                >
                  <span className="justify-self-start">
                    <Tag tone={row.tone}>{row.label}</Tag>
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative block h-2.5 bg-line"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 ${row.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <strong className="text-right">{n}</strong>
                </div>
              );
            })}
            <p className="mt-1 text-[13px] text-ink-3">
              {c.total === 0
                ? "No submissions yet."
                : `${c.withPin === c.total ? `All ${c.total}` : `${c.withPin} of ${c.total}`} came in with the drive PIN. ${c.notFound} ${c.notFound === 1 ? "is" : "are"} from students not on the shortlist for that round.`}
            </p>
          </section>
        </div>

        <section aria-labelledby="act-h" className="flex flex-col">
          <h2 id="act-h" className="mb-2.5 text-xl font-bold">
            Recent activity
          </h2>
          {o.activity.length === 0 && (
            <p className="border-t border-line py-2.5 text-sm text-ink-3">
              Nothing recorded yet.
            </p>
          )}
          {o.activity.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[150px_1fr] gap-4 border-t border-line py-2.5 text-sm"
            >
              <span className="text-ink-3">{auditWhen(a.createdAt)}</span>
              <span>
                {auditSentence({
                  action: a.action,
                  adminName: a.admin.name,
                  adminRole: a.admin.role,
                  summary: a.summary,
                  detail: a.detail,
                })}
              </span>
            </div>
          ))}
          <Link
            href={`/admin/audit?drive=${id}`}
            className="mt-2.5 text-sm font-bold"
          >
            Full audit log for this drive
          </Link>
        </section>
      </div>
    </>
  );
}
