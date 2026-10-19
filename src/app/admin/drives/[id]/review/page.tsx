import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveHeader } from "@/components/admin/DriveHeader";
import { checkTag, PageHead, Tag, TabLink, table } from "@/components/admin/ui";
import { daysAgo } from "@/lib/admin";
import { getDriveHeader } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { drivesWithPending, getReviewBatch } from "@/server/admin/review";
import { ApproveAllVerified, DriveSwitcher } from "./BatchControls";

export const metadata: Metadata = {
  title: "Review batch · Admin · Placement Question Bank",
};

const CHECKS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified", tag: "VERIFIED" },
  { key: "likely", label: "Likely", tag: "LIKELY" },
  { key: "not-found", label: "Not found", tag: "NOT_FOUND" },
] as const;

// A07 Review batch: every waiting submission in the drive with its checks,
// duplicate groups, and bulk approve for verified ones.
export default function ReviewBatchPage({
  params,
  searchParams,
}: PageProps<"/admin/drives/[id]/review">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Review batch" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={7} />
          </div>
        </>
      }
    >
      <ReviewBatch params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReviewBatch({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/drives/[id]/review">["params"];
  searchParams: PageProps<"/admin/drives/[id]/review">["searchParams"];
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const drive = await getDriveHeader(id);
  const [{ rows, groups }, others] = await Promise.all([
    getReviewBatch(id),
    drivesWithPending(),
  ]);

  const check = CHECKS.find((c) => c.key === sp.check) ?? CHECKS[0];
  const shown = "tag" in check ? rows.filter((r) => r.tag === check.tag) : rows;
  const count = (c: (typeof CHECKS)[number]) =>
    "tag" in c ? rows.filter((r) => r.tag === c.tag).length : rows.length;
  const base = `/admin/drives/${id}/review`;
  const approvable = rows.filter((r) => r.bulkApprovable).length;

  return (
    <>
      <DriveHeader
        drive={drive}
        tab="review"
        actions={<DriveSwitcher current={id} drives={others} />}
      />
      <div className="flex flex-col gap-7 px-5 pt-6 pb-12 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filter by check" className="flex flex-wrap">
            {CHECKS.map((c) => (
              <TabLink
                key={c.key}
                href={c.key === "all" ? base : `${base}?check=${c.key}`}
                selected={c.key === check.key}
              >
                {c.label}
                <span className="ml-1.5 font-medium text-ink-3">
                  {count(c)}
                </span>
              </TabLink>
            ))}
          </nav>
          <span className="flex flex-wrap items-start gap-2.5">
            {rows[0] && (
              <Link href={`${base}/${rows[0].id}`} className="btn-secondary">
                Review one by one
              </Link>
            )}
            <ApproveAllVerified driveId={id} count={approvable} />
          </span>
        </div>

        {shown.length === 0 ? (
          <p className="text-ink-3">
            {rows.length === 0
              ? "Nothing is waiting for review in this drive."
              : "Nothing in this view."}
          </p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th scope="col" className={table.th}>
                    Student
                  </th>
                  <th scope="col" className={table.th}>
                    Round
                  </th>
                  <th scope="col" className={table.th}>
                    Questions
                  </th>
                  <th scope="col" className={table.th}>
                    Checks
                  </th>
                  <th scope="col" className={table.th}>
                    Notes
                  </th>
                  <th scope="col" className={table.th}>
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const age = daysAgo(r.sent);
                  return (
                    <tr key={r.id} className={table.row}>
                      <td className={table.td}>
                        <Link
                          href={`${base}/${r.id}`}
                          className={table.rowLink}
                        >
                          {r.name}
                        </Link>
                        {r.meta && (
                          <div className="text-[13px] text-ink-3">{r.meta}</div>
                        )}
                      </td>
                      <td className={table.td}>{r.round}</td>
                      <td className={table.td}>{r.questions}</td>
                      <td className={`${table.td} text-[13px]`}>
                        <span className="flex flex-wrap gap-1">
                          <Tag tone={r.viaPin ? "muted" : "draft"}>
                            {r.viaPin ? "Via PIN" : "No PIN"}
                          </Tag>
                          {r.tag ? (
                            <Tag tone={checkTag[r.tag].tone}>
                              {checkTag[r.tag].label}
                            </Tag>
                          ) : (
                            <Tag tone="draft">Not checked</Tag>
                          )}
                        </span>
                      </td>
                      <td className={`${table.td} text-sm`}>{r.notes}</td>
                      <td
                        className={`${table.td} text-sm whitespace-nowrap text-ink-3`}
                      >
                        {age.endsWith("days") ? `${age} ago` : age}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {groups.length > 0 && (
          <section aria-labelledby="dg-h" className="flex flex-col">
            <h2 id="dg-h" className="mb-1.5 text-xl font-bold">
              Same question, sent by several students
            </h2>
            <p className="mb-2.5 text-ink-3">
              Approve one version and merge the others into it. Everyone who
              sent it is credited if they opted in.
            </p>
            {groups.map((g) => (
              <div
                key={g.key}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3.5"
              >
                <span className="flex flex-col">
                  <strong>{g.title}</strong>
                  <span className="text-sm text-ink-3">
                    {g.roundName} · sent by {g.senders}{" "}
                    {g.senders === 1 ? "student" : "students"}
                    {g.published > 0 && ` · ${g.published} already published`}
                  </span>
                </span>
                {g.firstSubmissionId && (
                  <Link
                    href={`${base}/${g.firstSubmissionId}`}
                    className="font-bold"
                  >
                    Review group
                  </Link>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
