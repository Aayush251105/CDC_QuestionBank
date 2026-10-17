import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { SubmitHeader } from "@/components/Stepper";
import { aiEnabled } from "@/server/ai";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { AddQuestions } from "./AddQuestions";

export const metadata: Metadata = {
  title: "Add the questions · Submit an OA",
};

type Props = PageProps<"/submit/[id]/questions">;

// S3 (CLAUDE.md 2a.9): notes and/or photos on one page; the AI does the
// splitting and sorting.
export default function QuestionsStepPage(props: Props) {
  return (
    <>
      <SubmitHeader step={3} title="Add the questions" />
      <div className="wrap max-w-245 pt-9 pb-16">
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <QuestionsStep {...props} />
        </Suspense>
      </div>
    </>
  );
}

async function QuestionsStep({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      roundId: true,
      rawText: true,
      _count: { select: { rawQuestions: true } },
      scanPages: {
        orderBy: { pageNo: "asc" },
        select: {
          id: true,
          pageNo: true,
          readStatus: true,
          extractedText: true,
        },
      },
    },
  });
  if (!s) notFound();
  if (s.status !== "DRAFT") redirect(`/me/submissions/${s.id}`);
  // The round comes first (S2).
  if (!s.roundId) redirect(`/submit/${s.id}/round`);

  return (
    <AddQuestions
      submissionId={s.id}
      initialText={s.rawText ?? ""}
      initialPages={s.scanPages.map((p) => ({
        id: p.id,
        pageNo: p.pageNo,
        // A page left "Reading" by a dropped connection counts as unreadable.
        status: p.readStatus === "DONE" ? "DONE" : "UNREADABLE",
        text: p.extractedText ?? "",
      }))}
      maxPages={Number(process.env.UPLOAD_MAX_PAGES) || 10}
      photoReadingOn={aiEnabled()}
      alreadySorted={s._count.rawQuestions > 0}
    />
  );
}
