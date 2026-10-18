import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Markdown } from "@/components/Markdown";
import { SkeletonRows } from "@/components/Skeleton";
import { StatusTag } from "@/components/StatusTag";
import { driveLabel } from "@/lib/drives";
import {
  difficultyLabel,
  fullDate,
  istDate,
  istDateTime,
  plural,
  questionTypeLabel,
} from "@/lib/labels";
import { studentCanEdit, submissionRef } from "@/lib/review";
import { studentStatus } from "@/lib/status";
import { stepHref } from "@/lib/submit";
import { requireUser } from "@/server/auth";
import { visitsThatYear } from "@/server/queries/submit";
import { getOwnSubmissionStatus } from "@/server/queries/submissions";
import { WithdrawPanel } from "./WithdrawPanel";

export const metadata: Metadata = {
  title: "Submission status · Placement Question Bank",
};

type Props = PageProps<"/me/submissions/[id]">;

// S6. Where one submission is in the CDC review. Shows only In review or
// Reviewed, never the outcome or a reason (CLAUDE.md 2a.2).
export default function SubmissionStatusPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="wrap pt-7 pb-18">
          <SkeletonRows rows={6} />
        </div>
      }
    >
      <SubmissionStatus {...props} />
    </Suspense>
  );
}

// First paragraph of a question as plain text, for the short preview.
function excerpt(markdown: string): string {
  const para =
    markdown
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !/^\*\*[^*]+\*\*$/.test(p) && !p.startsWith("```")) ??
    "";
  const text = para.replace(/[*`#]/g, "").replace(/\s+/g, " ").trim();
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

type Step = { label: string; when: string; state: "done" | "now" | "later" };

async function SubmissionStatus({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const s = await getOwnSubmissionStatus(id, user.id);
  if (!s) notFound();
  if (s.status === "DRAFT") redirect(stepHref(s.id, s.lastStep));

  const { drive } = s;
  const visits = await visitsThatYear(drive.companyId, drive.year);
  const label = driveLabel(drive.year, drive.sequence, visits);
  const shown = studentStatus(s.status);
  const withdrawn = s.status === "WITHDRAWN";
  const canEdit = studentCanEdit(s);
  const ref = submissionRef(s.id, drive.year);
  const source = [
    s.rawText ? "typed" : null,
    s._count.scanPages ? "from photos" : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const steps: Step[] = withdrawn
    ? [
        {
          label: "Submitted",
          when: s.submittedAt ? istDateTime(s.submittedAt) : "",
          state: "done",
        },
        { label: "Withdrawn", when: istDateTime(s.updatedAt), state: "now" },
      ]
    : [
        {
          label: "Submitted",
          when: s.submittedAt ? istDateTime(s.submittedAt) : "",
          state: "done",
        },
        {
          label: "In review",
          when:
            shown === "Reviewed"
              ? s.reviewStartedAt
                ? istDate(s.reviewStartedAt)
                : ""
              : s.reviewStartedAt
                ? `The CDC started on ${istDate(s.reviewStartedAt)}`
                : "Now · reviewed in batches",
          state: shown === "Reviewed" ? "done" : "now",
        },
        {
          label: "Reviewed",
          when: s.reviewedAt ? istDate(s.reviewedAt) : "Not yet",
          state: shown === "Reviewed" ? "now" : "later",
        },
      ];

  const sections = Array.isArray(s.sections)
    ? (s.sections as { name: string; count: number | null }[])
        .map((x) => (x.count ? `${x.name} (${x.count})` : x.name))
        .join(", ")
    : "";
  const details = (
    [
      ["Role", s.role ?? ""],
      ["Date", s.testDate ? fullDate(s.testDate) : ""],
      ["Platform", s.platform ?? ""],
      ["Duration", s.durationMin ? `${s.durationMin} minutes` : ""],
      ["Sections", sections],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-3 pt-7 pb-8">
          <Breadcrumbs
            items={[
              { label: "My submissions", href: "/me/submissions" },
              { label: ref },
            ]}
          />
          <p className="eyebrow">
            Submission · {drive.company.name} · {label}
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="text-[30px] leading-[1.15] font-bold sm:text-[38px]">
              {s.round?.name ?? "Round"}
            </h1>
            <StatusTag status={s.status} />
          </div>
          <p className="text-ink-2">
            {[
              s.submittedAt && `Submitted ${istDate(s.submittedAt)}`,
              !withdrawn && plural(s.rawQuestions.length, "question"),
              !withdrawn && source,
              !withdrawn && (s.credit ? "credited by name" : "anonymous"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </section>

      <div className="wrap grid items-start gap-12 pt-9 pb-18 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="flex min-w-0 flex-col gap-9">
          {canEdit && <WithdrawPanel submissionId={s.id} />}
          {shown === "In review" && !canEdit && (
            <p className="border-l-3 border-line-strong bg-grey-band px-5 py-4 text-[15px]">
              <strong>The CDC has started reviewing this.</strong> It can no
              longer be edited or withdrawn.
            </p>
          )}
          {shown === "Reviewed" && (
            <p className="border-l-3 border-line-strong bg-unpublished-bg px-5 py-4 text-[15px]">
              <strong>The CDC has reviewed this submission.</strong> Thank you
              for sending it. You can submit other rounds at any time.
            </p>
          )}
          {withdrawn && (
            <p className="border-l-3 border-line-strong bg-grey-band px-5 py-4 text-[15px]">
              <strong>You withdrew this submission.</strong> Its questions were
              deleted. You can submit this round again at any time.
            </p>
          )}

          {!withdrawn && (
            <section aria-labelledby="q-h" className="flex flex-col">
              <h2
                id="q-h"
                className="mb-1 border-b-2 border-charcoal pb-2.5 text-[22px] font-bold"
              >
                Questions you sent
              </h2>
              {s.rawQuestions.map((q, i) => {
                const text = q.textCleaned || q.textOriginal;
                const short = excerpt(text);
                // Only offer the full text when the preview leaves some out.
                const more = /\n\s*\n/.test(text.trim()) || short.endsWith("…");
                return (
                  <article
                    key={q.id}
                    className="flex flex-col gap-2 border-b border-line py-5"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="text-[17px] font-bold">
                        <span className="text-crimson">
                          {String(i + 1).padStart(2, "0")}
                        </span>{" "}
                        · {q.title ?? "Question"}
                      </h3>
                      <span className="text-sm text-ink-3">
                        {questionTypeLabel[q.type]}
                        {q.suggestedDifficulty &&
                          ` · ${difficultyLabel[q.suggestedDifficulty]}`}
                      </span>
                    </div>
                    <p className="text-[15px] leading-relaxed font-light text-ink-2">
                      {short}
                    </p>
                    {more && (
                      <details className="group">
                        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-crimson">
                          <span className="group-open:hidden">
                            Show the full question
                          </span>
                          <span className="hidden group-open:inline">
                            Hide the full question
                          </span>
                        </summary>
                        <div className="mt-1 border-l-2 border-line pl-4">
                          <Markdown source={text} />
                        </div>
                      </details>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          <section aria-labelledby="r-h" className="flex flex-col gap-2.5">
            <h2
              id="r-h"
              className="border-b-2 border-charcoal pb-2.5 text-[22px] font-bold"
            >
              Round details
            </h2>
            <dl className="grid grid-cols-[120px_1fr] gap-x-5 gap-y-2.5 text-[15px] sm:grid-cols-[160px_1fr]">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="lbl pt-0.5">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {details.length === 0 && (
              <p className="text-[15px] text-ink-3">No round details given.</p>
            )}
          </section>
        </div>

        <aside
          aria-labelledby="tl-h"
          className="flex flex-col gap-1 bg-grey-band p-6"
        >
          <h2 id="tl-h" className="eyebrow mb-3.5">
            Progress
          </h2>
          <ol>
            {steps.map((step) => (
              <li
                key={step.label}
                aria-current={step.state === "now" ? "step" : undefined}
                className="grid grid-cols-[22px_1fr] gap-3 pb-4.5"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 size-3.5 border-2 ${
                    step.state === "done"
                      ? "border-charcoal bg-charcoal"
                      : step.state === "now"
                        ? "border-crimson bg-crimson"
                        : "border-line-strong bg-white"
                  }`}
                />
                <span className="flex flex-col">
                  <strong
                    className={`text-[15px] ${
                      step.state === "now"
                        ? "text-crimson"
                        : step.state === "later"
                          ? "text-ink-3"
                          : ""
                    }`}
                  >
                    {step.label}
                  </strong>
                  {step.when && (
                    <span className="text-[13px] text-ink-3">{step.when}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 border-t border-line pt-3.5 text-[13px] text-ink-3">
            Who sent a question is never shown to other students unless you
            chose to be credited.
          </p>
        </aside>
      </div>
    </>
  );
}
