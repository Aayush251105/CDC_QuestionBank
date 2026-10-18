import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { driveLabel } from "@/lib/drives";
import { plural } from "@/lib/labels";
import { studentCanEdit, submissionRef } from "@/lib/review";
import { stepHref } from "@/lib/submit";
import { startNextRound } from "@/server/actions/review";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { visitsThatYear } from "@/server/queries/submit";

export const metadata: Metadata = {
  title: "Submitted · Submit an OA",
};

type Props = PageProps<"/submit/[id]/done">;

// S5. Confirmation after "Submit for review". Says only what happens next,
// never what the outcome will be (CLAUDE.md 2a.2).
export default function SubmittedPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="wrap pt-11 pb-18">
          <SkeletonRows rows={5} />
        </div>
      }
    >
      <Submitted {...props} />
    </Suspense>
  );
}

async function Submitted({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      lastStep: true,
      reviewStartedAt: true,
      round: { select: { name: true } },
      drive: {
        select: {
          year: true,
          sequence: true,
          companyId: true,
          status: true,
          verified: true,
          company: { select: { name: true } },
        },
      },
      _count: { select: { rawQuestions: true, scanPages: true } },
    },
  });
  if (!s) notFound();
  if (s.status === "DRAFT") redirect(stepHref(s.id, s.lastStep));
  if (s.status === "WITHDRAWN") redirect(`/me/submissions/${s.id}`);

  const { drive } = s;
  const company = drive.company.name;
  const visits = await visitsThatYear(drive.companyId, drive.year);
  const label = driveLabel(drive.year, drive.sequence, visits);
  const open = !(drive.verified && drive.status === "CLOSED");
  const canEdit = studentCanEdit(s);
  const status = `/me/submissions/${s.id}`;

  const steps = [
    {
      n: "1",
      done: true,
      title: "Submitted",
      body: "Received. It shows as In review in My submissions.",
    },
    {
      n: "2",
      done: false,
      title: "CDC review",
      body: "The CDC checks submissions in batches during the drive season.",
    },
    {
      n: "3",
      done: false,
      title: "Reviewed",
      body: `It then shows as Reviewed. Questions the CDC approves appear under ${company} · ${label} for every SNU student.`,
    },
  ];

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-3 pt-11 pb-9">
          <p className="eyebrow">Submit an OA · Sent to the CDC</p>
          <h1
            tabIndex={-1}
            className="text-[32px] leading-[1.15] font-bold sm:text-[40px]"
          >
            Thank you. Your questions are with the CDC.
          </h1>
          <p className="max-w-180 text-[17px] text-ink-2">
            {company} · {label} {s.round?.name ?? "round"} ·{" "}
            {plural(s._count.rawQuestions, "question")}. Reference{" "}
            <strong className="font-mono text-[15px]">
              {submissionRef(s.id, drive.year)}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={status} className="btn-primary">
              Track this submission
            </Link>
            <Link href="/submit" className="btn-secondary">
              Submit another round
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-12 pt-11 pb-18">
        <section aria-labelledby="next-h">
          <h2
            id="next-h"
            className="mb-5 border-b-2 border-charcoal pb-2.5 text-[22px] font-bold"
          >
            What happens next
          </h2>
          <ol className="flex flex-col">
            {steps.map((step) => (
              <li
                key={step.n}
                className="grid grid-cols-[44px_1fr] gap-4 pb-5.5"
              >
                <span
                  className={`flex size-8 items-center justify-center border border-charcoal text-sm font-bold ${
                    step.done ? "bg-charcoal text-white" : "bg-white"
                  }`}
                >
                  {step.done ? (
                    <>
                      <span aria-hidden="true">✓</span>
                      <span className="sr-only">Done:</span>
                    </>
                  ) : (
                    step.n
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <strong>{step.title}</strong>
                  <span className="text-sm text-ink-3">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="flex flex-col gap-6">
          {s._count.scanPages > 0 && (
            <div className="flex flex-col gap-2.5 bg-peach p-6">
              <h2 className="text-lg font-bold">Your photos were not kept</h2>
              <p className="text-[15px]">
                We kept only the text you confirmed. The photos you added were
                read and dropped straight away; they were never saved.
              </p>
            </div>
          )}
          {canEdit && (
            <div className="flex flex-col gap-2.5 border-t-4 border-charcoal pt-4.5">
              <h2 className="text-lg font-bold">Remember something else?</h2>
              <p className="text-sm text-ink-3">
                You can edit this submission until the CDC starts reviewing it.
              </p>
              <Link
                href={`/submit/${s.id}/review`}
                className="self-start font-bold"
              >
                Edit submission
              </Link>
            </div>
          )}
          {open && (
            <div className="flex flex-col gap-2.5 border-t border-line pt-4.5">
              <h2 className="text-lg font-bold">
                Sat another round at {company}?
              </h2>
              <p className="text-sm text-ink-3">
                Each round is a separate submission. Your drive will be filled
                in for you.
              </p>
              <form action={startNextRound.bind(null, s.id)}>
                <button
                  type="submit"
                  className="min-h-11 cursor-pointer font-bold text-crimson hover:text-crimson-dark"
                >
                  Add the next round
                </button>
              </form>
            </div>
          )}
          <Link href="/me/submissions" className="self-start font-bold">
            See all my submissions
          </Link>
        </aside>
      </div>
    </>
  );
}
