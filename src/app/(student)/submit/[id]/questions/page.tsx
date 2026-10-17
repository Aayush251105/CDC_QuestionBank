import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { SubmitHeader } from "@/components/Stepper";
import { emptyFields, type QuestionFields } from "@/lib/questionForm";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { type EditorQuestion, QuestionEditor } from "./QuestionEditor";

export const metadata: Metadata = {
  title: "Type questions · Submit an OA",
};

type Props = PageProps<"/submit/[id]/questions">;

// S3a. Type the questions, one form per question.
export default function QuestionsStepPage(props: Props) {
  return (
    <>
      <SubmitHeader step={3} title="Type the questions" />
      <div className="wrap pt-9 pb-16">
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <QuestionsStep {...props} />
        </Suspense>
      </div>
    </>
  );
}

async function QuestionsStep({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const { q } = await searchParams;
  const s = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      roundId: true,
      sections: true,
      rawQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          section: true,
          difficultyFelt: true,
          notes: true,
          fields: true,
          textOriginal: true,
          title: true,
          scanPageNo: true,
        },
      },
    },
  });
  if (!s) notFound();
  if (s.status !== "DRAFT") redirect(`/me/submissions/${s.id}`);
  // The round comes first (S2).
  if (!s.roundId) redirect(`/submit/${s.id}/round`);

  const sections = Array.isArray(s.sections)
    ? (s.sections as { name: string }[]).map((x) => x.name).filter(Boolean)
    : [];
  const initial: EditorQuestion[] = s.rawQuestions.map((r) => {
    const saved =
      r.fields && typeof r.fields === "object" && !Array.isArray(r.fields)
        ? (r.fields as Partial<QuestionFields>)
        : // Typed before the form kept its fields: start from the text.
          { title: r.title ?? "", statement: r.textOriginal };
    return {
      key: r.id,
      id: r.id,
      type: r.type,
      section: r.section ?? "",
      difficultyFelt: r.difficultyFelt,
      notes: r.notes ?? "",
      fields: { ...emptyFields(), ...saved },
      // Read from an upload: shown here, corrected on the review step.
      fromScan: r.scanPageNo !== null ? r.textOriginal : null,
    };
  });

  return (
    <QuestionEditor
      submissionId={s.id}
      sections={sections}
      initial={initial}
      startKey={typeof q === "string" ? q : null}
    />
  );
}
