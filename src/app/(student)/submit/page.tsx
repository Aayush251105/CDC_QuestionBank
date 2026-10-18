import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { SubmitHeader } from "@/components/Stepper";
import { stepHref } from "@/lib/submit";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getLatestDraft } from "@/server/queries/submit";
import { PinEntry } from "./PinEntry";
import { UnlistedDrive } from "./UnlistedDrive";

export const metadata: Metadata = {
  title: "Submit an OA · Placement Question Bank",
};

// S1. Enter the drive PIN from the CDC, or add a drive that is not listed
// (CLAUDE.md 2a.1, 2a.6). Built from the decisions while the PIN design is
// being redrawn.
export default function SubmitStartPage() {
  return (
    <>
      <SubmitHeader step={1} title="Which drive was it?" />
      <div className="wrap flex flex-wrap gap-14 pt-9 pb-16">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <Suspense fallback={<SkeletonRows rows={3} />}>
            <Start />
          </Suspense>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
            <Link href="/" className="btn-secondary">
              Cancel
            </Link>
            <span className="text-sm text-ink-3">
              Your progress saves as you go
            </span>
          </div>
        </div>
        <aside className="flex flex-[1_1_300px] flex-col gap-7">
          <section className="flex flex-col gap-3.5 border-t-4 border-charcoal bg-grey-band p-6">
            <h2 className="text-lg font-bold">How submitting works</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px]">
              <li>Enter the drive PIN from the CDC and pick your role.</li>
              <li>Choose the round and add its details.</li>
              <li>Type the questions or upload photos of your sheet.</li>
              <li>Check our cleaned-up version and submit.</li>
              <li>The CDC reviews it; you will see it in My submissions.</li>
            </ol>
          </section>
          <section className="flex flex-col gap-2.5 text-[15px]">
            <h2 className="text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
              Before you start
            </h2>
            <p>
              Only share a test you sat yourself, and only after its window has
              closed. You stay anonymous unless you choose credit.{" "}
              <Link href="/help#honour-code" className="font-bold">
                Read the honour code
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

async function Start() {
  const user = await requireUser();
  const [draft, companies] = await Promise.all([
    getLatestDraft(user.id),
    db.company.findMany({
      where: { hidden: false, verified: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);
  return (
    <>
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-peach px-5 py-4">
          <span>
            <strong>You have an unfinished draft</strong> for{" "}
            {draft.drive.company.name} {draft.drive.year}
            {draft.round
              ? `, ${draft.round.name}`
              : draft.role
                ? `, ${draft.role}`
                : ""}
            .
          </span>
          <Link href={stepHref(draft.id, draft.lastStep)} className="font-bold">
            Continue the draft
          </Link>
        </div>
      )}
      <PinEntry />
      <UnlistedDrive
        companies={companies.map((c) => c.name)}
        year={new Date().getFullYear()}
      />
    </>
  );
}
