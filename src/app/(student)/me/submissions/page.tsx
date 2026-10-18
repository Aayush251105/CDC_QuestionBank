import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { StatusTag } from "@/components/StatusTag";
import { driveLabel } from "@/lib/drives";
import { istDate, plural, timeAgo } from "@/lib/labels";
import { SUBMISSION_TABS, type SubmissionTab, tabOf } from "@/lib/status";
import { stepHref } from "@/lib/submit";
import { requireUser } from "@/server/auth";
import { listOwnSubmissions, visitCounts } from "@/server/queries/submissions";

export const metadata: Metadata = {
  title: "My submissions · Placement Question Bank",
};

type Props = PageProps<"/me/submissions">;

// Page 10. Students see only Draft, In review and Reviewed (CLAUDE.md 2a.2).
// The tab lives in the URL (?status=in-review).
export default function MySubmissionsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<MySubmissionsSkeleton />}>
      <MySubmissions searchParams={searchParams} />
    </Suspense>
  );
}

async function MySubmissions({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = SUBMISSION_TABS.find((t) => t.key === params.status)?.key;
  const all = await listOwnSubmissions(user.id);
  const visits = await visitCounts(all.map((s) => s.drive));

  const rows = all.map((s) => {
    const kind = tabOf(s.status) as SubmissionTab;
    const label = driveLabel(
      s.drive.year,
      s.drive.sequence,
      visits.get(`${s.drive.companyId}:${s.drive.year}`) ?? 1,
    );
    const n = s._count.rawQuestions;
    return {
      id: s.id,
      kind,
      status: s.status,
      company: s.drive.company.name,
      round: [s.round?.name ?? "Round not chosen yet", label, s.role]
        .filter(Boolean)
        .join(" · "),
      questions: kind === "draft" && !n ? "–" : String(n),
      // Shown under the round on phones, where the column is hidden.
      questionsText:
        kind === "draft" && !n ? "No questions yet" : plural(n, "question"),
      when:
        kind === "draft"
          ? `Saved ${timeAgo(s.updatedAt)}`
          : kind === "reviewed" && s.reviewedAt
            ? `Reviewed ${istDate(s.reviewedAt)}`
            : s.submittedAt
              ? `Sent ${istDate(s.submittedAt)}`
              : `Updated ${istDate(s.updatedAt)}`,
      href:
        kind === "draft"
          ? stepHref(s.id, s.lastStep)
          : `/me/submissions/${s.id}`,
      action: kind === "draft" ? "Continue" : "View",
    };
  });
  const shown = tab ? rows.filter((r) => r.kind === tab) : rows;
  const count = (k?: SubmissionTab) =>
    k ? rows.filter((r) => r.kind === k).length : rows.length;

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9">
          <p className="eyebrow">Your account</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
              My submissions
            </h1>
            <Link href="/submit" className="btn-primary">
              Submit an OA
            </Link>
          </div>
          <p className="text-ink-2">
            Every round you have shared, and where it is in the CDC review.
          </p>
          <nav aria-label="Filter by status" className="mt-4.5 flex flex-wrap">
            {[{ key: undefined, label: "All" }, ...SUBMISSION_TABS].map((t) => {
              const active = t.key === tab;
              return (
                <Link
                  key={t.label}
                  href={
                    t.key
                      ? `/me/submissions?status=${t.key}`
                      : "/me/submissions"
                  }
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`mr-6 flex min-h-11.5 items-center border-b-2 px-0.5 text-[15px] font-bold no-underline ${
                    active
                      ? "border-crimson text-crimson"
                      : "border-transparent text-ink-2 hover:text-charcoal"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 font-medium text-ink-3">
                    {count(t.key)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="wrap flex flex-col gap-7 pt-8 pb-18">
        {params.withdrawn === "1" && (
          <p
            role="status"
            className="border-l-3 border-charcoal bg-grey-band px-5 py-3.5 text-[15px]"
          >
            <strong>Submission withdrawn.</strong> Its questions were deleted.
            You can submit that round again at any time.
          </p>
        )}

        {shown.length === 0 ? (
          <p className="border-b border-line py-7 text-ink-3">
            {rows.length === 0 ? (
              <>
                You have not shared any rounds yet.{" "}
                <Link href="/submit" className="font-bold">
                  Submit an OA
                </Link>
              </>
            ) : (
              "Nothing here yet."
            )}
          </p>
        ) : (
          <table className="w-full border-collapse text-[15px]">
            <caption className="pb-2.5 text-left text-sm text-ink-3">
              {plural(shown.length, "submission")}
              {tab && ` · ${SUBMISSION_TABS.find((t) => t.key === tab)?.label}`}
            </caption>
            <thead>
              <tr className="border-b-2 border-charcoal text-left">
                <th scope="col" className="lbl px-3 py-2.5">
                  Company and round
                </th>
                <th
                  scope="col"
                  className="lbl hidden px-3 py-2.5 sm:table-cell"
                >
                  Questions
                </th>
                <th
                  scope="col"
                  className="lbl hidden px-3 py-2.5 md:table-cell"
                >
                  Last change
                </th>
                <th scope="col" className="lbl px-3 py-2.5">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line align-top hover:bg-grey-band"
                >
                  <td className="px-3 py-4">
                    <Link
                      href={r.href}
                      className="font-bold text-charcoal no-underline hover:text-crimson"
                    >
                      {r.company}
                    </Link>
                    <div className="text-sm text-ink-3">{r.round}</div>
                    <div className="text-sm text-ink-3 md:hidden">
                      <span className="sm:hidden">{r.questionsText} · </span>
                      {r.when}
                    </div>
                  </td>
                  <td className="hidden px-3 py-4 sm:table-cell">
                    {r.questions}
                  </td>
                  <td className="hidden px-3 py-4 text-sm text-ink-3 md:table-cell">
                    {r.when}
                  </td>
                  <td className="px-3 py-4">
                    <StatusTag status={r.status} />
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Link
                      href={r.href}
                      className="font-bold whitespace-nowrap"
                      aria-label={`${r.action}: ${r.company}, ${r.round}`}
                    >
                      {r.action}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <section
          aria-labelledby="key-h"
          className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-7 gap-y-4.5 border-t-2 border-charcoal pt-5"
        >
          <h2 id="key-h" className="eyebrow col-span-full">
            What the statuses mean
          </h2>
          <div className="flex flex-col items-start gap-1.5">
            <StatusTag status="DRAFT" />
            <span className="text-sm text-ink-3">
              Started but not sent. Only you can see it.
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <StatusTag status="PENDING_REVIEW" />
            <span className="text-sm text-ink-3">
              With the CDC. You can still edit or withdraw it until the review
              starts.
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <StatusTag status="PUBLISHED" />
            <span className="text-sm text-ink-3">
              The CDC has finished with it. Questions it approves are live for
              every SNU student.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function MySubmissionsSkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9 pb-14">
          <p className="eyebrow">Your account</p>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
            My submissions
          </h1>
        </div>
      </section>
      <div className="wrap pt-8 pb-18">
        <SkeletonRows rows={5} />
      </div>
    </>
  );
}
