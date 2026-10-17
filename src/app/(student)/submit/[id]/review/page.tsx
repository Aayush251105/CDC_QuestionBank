import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { SubmitHeader } from "@/components/Stepper";
import { driveLabel } from "@/lib/drives";
import { optionsText, studentCanEdit } from "@/lib/review";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { visitsThatYear } from "@/server/queries/submit";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = {
  title: "Check the cleaned-up version · Submit an OA",
};

type Props = PageProps<"/submit/[id]/review">;

const TITLE = "Check the cleaned-up version";

// S4. The student compares the AI's tidy version with what they gave us,
// fixes it, accepts the honour statement and submits.
export default function ReviewStepPage(props: Props) {
  return (
    <Suspense
      fallback={
        <>
          <SubmitHeader step={4} title={TITLE} />
          <div className="wrap pt-9 pb-16">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <ReviewStep {...props} />
    </Suspense>
  );
}

async function ReviewStep({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      reviewStartedAt: true,
      roundId: true,
      credit: true,
      submittedAt: true,
      user: { select: { creditByDefault: true } },
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
      rawQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          textOriginal: true,
          textCleaned: true,
          options: true,
          suggestedTags: true,
          suggestedDifficulty: true,
          scanPageNo: true,
        },
      },
    },
  });
  if (!s) notFound();
  if (!studentCanEdit(s)) redirect(`/me/submissions/${s.id}`);
  if (!s.roundId) redirect(`/submit/${s.id}/round`);
  if (s.rawQuestions.length === 0) {
    redirect(
      s.status === "DRAFT"
        ? `/submit/${s.id}/questions`
        : `/me/submissions/${s.id}`,
    );
  }

  const { drive } = s;
  const visits = await visitsThatYear(drive.companyId, drive.year);
  const context = `${drive.company.name} ${driveLabel(drive.year, drive.sequence, visits)} · ${s.round?.name ?? "Round"}`;

  return (
    <>
      <SubmitHeader step={4} title={TITLE} context={context}>
        <p className="max-w-180 text-ink-2">
          We fixed grammar and layout and kept every number and condition.
          Compare each question with what you gave us and correct anything that
          changed the meaning.
        </p>
      </SubmitHeader>
      <div className="wrap pt-9 pb-16">
        <ReviewForm
          submissionId={s.id}
          alreadySent={s.status === "PENDING_REVIEW"}
          driveClosed={drive.verified && drive.status === "CLOSED"}
          initialCredit={s.submittedAt ? s.credit : s.user.creditByDefault}
          initialQuestions={s.rawQuestions.map((q) => ({
            id: q.id,
            title: q.title ?? "Question",
            source: q.scanPageNo
              ? `Read from photo ${q.scanPageNo}`
              : "Typed by you",
            original: q.textOriginal,
            type: q.type,
            difficulty: q.suggestedDifficulty ?? "MEDIUM",
            cleaned: q.textCleaned ?? q.textOriginal,
            options: optionsText(q.options),
            topics: q.suggestedTags.join(", "),
          }))}
        />
      </div>
    </>
  );
}
