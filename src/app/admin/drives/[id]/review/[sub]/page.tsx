import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkeletonRows } from "@/components/Skeleton";
import { checkTag, PageHead, submissionTag, Tag } from "@/components/admin/ui";
import { formatPin } from "@/lib/pin";
import { getDriveHeader } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { getSubmissionReview } from "@/server/admin/submission";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = {
  title: "Review a submission · Admin · Placement Question Bank",
};

const decisionTag = {
  APPROVED: { label: "Approved", tone: "good" },
  MERGED: { label: "Merged", tone: "pending" },
  REJECTED: { label: "Rejected", tone: "muted" },
} as const;

const pad = (n: number) => String(n).padStart(2, "0");

// "14 Oct 2025, 9:41 pm" in India time
function sentAt(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// A08 Review a submission: original beside the cleaned text; approve, edit,
// merge or reject with an internal reason.
export default function ReviewSubmissionPage({
  params,
}: PageProps<"/admin/drives/[id]/review/[sub]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Review a submission" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <ReviewSubmission params={params} />
    </Suspense>
  );
}

async function ReviewSubmission({
  params,
}: {
  params: PageProps<"/admin/drives/[id]/review/[sub]">["params"];
}) {
  await requireAdmin();
  const { id, sub: subId } = await params;
  const drive = await getDriveHeader(id);
  const s = await getSubmissionReview(id, subId);
  const base = `/admin/drives/${id}`;
  const u = s.user;
  const waiting = s.status === "PENDING_REVIEW";
  const status = submissionTag[s.status];

  return (
    <>
      <PageHead
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Drives", href: "/admin/drives" },
              { label: drive.title.replace(/ · /g, " "), href: base },
              { label: "Review", href: `${base}/review` },
              { label: u.name },
            ]}
          />
        }
        eyebrow={
          waiting && s.position
            ? `Submission ${s.position} of ${s.queueSize} · ${s.round?.name ?? ""}`
            : (s.round?.name ?? "Round not picked yet")
        }
        title={`${u.name} · ${s.questions.length} ${s.questions.length === 1 ? "question" : "questions"}`}
        actions={
          <>
            {s.prevId && (
              <Link
                href={`${base}/review/${s.prevId}`}
                className="btn-secondary min-h-9 px-3"
              >
                Previous
              </Link>
            )}
            {s.nextId && s.nextId !== s.id && (
              <Link
                href={`${base}/review/${s.nextId}`}
                className="btn-secondary min-h-9 px-3"
              >
                Next
              </Link>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-start gap-8 px-5 pt-6 pb-12 sm:px-8">
        <aside
          aria-label="Submitter"
          className="flex max-w-70 flex-[1_1_240px] flex-col gap-4"
        >
          <div className="flex flex-col gap-3 bg-grey-band p-4.5 text-sm">
            <div>
              <span className="lbl">Student</span>
              <div className="text-[15px] font-bold">{u.name}</div>
              <div className="text-[13px] text-ink-3">
                {[
                  u.rollNo,
                  [u.programme, u.branch, u.gradYear].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(" · ") || u.email}
              </div>
            </div>
            <div>
              <span className="lbl">PIN</span>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={s.enteredWithPin ? "muted" : "draft"}>
                  {s.enteredWithPin ? "Via PIN" : "No PIN"}
                </Tag>
                {s.pinUsed && (
                  <span className="font-mono">{formatPin(s.pinUsed)}</span>
                )}
              </div>
            </div>
            <div>
              <span className="lbl">Shortlist</span>
              <div>
                {s.verificationTag ? (
                  <Tag tone={checkTag[s.verificationTag].tone}>
                    {checkTag[s.verificationTag].label}
                  </Tag>
                ) : (
                  <Tag tone="draft">Not checked</Tag>
                )}
              </div>
              <div className="text-[13px] text-ink-3">{s.shortlistNote}</div>
            </div>
            <div>
              <span className="lbl">Sent</span>
              <div>
                {sentAt(s.submittedAt ?? s.createdAt)} ·{" "}
                {s._count.scanPages > 0
                  ? `${s.mode === "SCAN" ? "" : "typed and "}${s._count.scanPages} scanned ${s._count.scanPages === 1 ? "page" : "pages"}`
                  : "typed"}
              </div>
            </div>
            <div>
              <span className="lbl">Credit</span>
              <div>{s.credit ? "Wants to be named" : "Anonymous"}</div>
            </div>
            {!waiting && (
              <div>
                <span className="lbl">Status</span>
                <div>
                  <Tag tone={status.tone}>{status.label}</Tag>
                </div>
              </div>
            )}
          </div>
          {s.otherSubs > 0 && (
            <Link
              href={`/admin/students?q=${encodeURIComponent(u.rollNo ?? u.email)}`}
              className="text-sm font-bold"
            >
              This student&apos;s other submissions ({s.otherSubs})
            </Link>
          )}
          <p className="text-[13px] text-ink-3">
            Rejections are never shown to the student. The reason you pick stays
            inside the CDC.
          </p>
        </aside>

        {waiting ? (
          <ReviewForm
            driveId={id}
            submissionId={s.id}
            questions={s.questions.map((q) => ({
              id: q.id,
              order: q.order,
              title: q.title,
              note: q.note,
              original: q.textOriginal,
              cleaned: q.textCleaned ?? q.textOriginal,
              type: q.type,
              difficulty: q.suggestedDifficulty ?? "MEDIUM",
              topics: q.suggestedTags.join(", "),
              suggestedMerge: q.suggestedMerge,
            }))}
            candidates={s.candidates}
            tags={s.tags}
          />
        ) : (
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <p className="bg-grey-band px-4 py-3 text-[15px]">
              {s.status === "DRAFT" || s.status === "PROCESSING"
                ? "The student has not sent this submission yet."
                : s.status === "WITHDRAWN"
                  ? "The student withdrew this submission."
                  : "This submission has been reviewed. To change a published question, use Questions."}
            </p>
            {s.questions.map((q) => (
              <article key={q.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-charcoal pb-2">
                  <h2 className="text-lg font-bold">
                    <span className="text-crimson">{pad(q.order)}</span> ·{" "}
                    {q.title}
                  </h2>
                  {q.decision && (
                    <Tag tone={decisionTag[q.decision].tone}>
                      {decisionTag[q.decision].label}
                    </Tag>
                  )}
                </div>
                <div className="border border-line bg-grey-band px-3.5 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                  {q.textOriginal}
                </div>
                {q.sources[0] && (
                  <span className="text-[13px] text-ink-3">
                    Published as &ldquo;{q.sources[0].question.title}&rdquo;
                  </span>
                )}
              </article>
            ))}
            <Link href={`${base}/review`} className="btn-secondary self-start">
              Back to the batch
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
