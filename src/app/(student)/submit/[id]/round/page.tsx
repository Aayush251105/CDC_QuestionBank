import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { SubmitHeader } from "@/components/Stepper";
import { driveLabel, roundIsFor } from "@/lib/drives";
import { requireUser } from "@/server/auth";
import { getOwnSubmission, visitsThatYear } from "@/server/queries/submit";
import { type RoundInitial, RoundForm } from "./RoundForm";

export const metadata: Metadata = {
  title: "Round details · Submit an OA",
};

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

// S2. Tell us about the round.
export default function RoundStepPage(props: PageProps<"/submit/[id]/round">) {
  return (
    <>
      <SubmitHeader step={2} title="Tell us about the round" />
      <div className="wrap flex flex-wrap gap-14 pt-9 pb-16">
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <RoundStep {...props} />
        </Suspense>
      </div>
    </>
  );
}

async function RoundStep({ params }: PageProps<"/submit/[id]/round">) {
  const user = await requireUser();
  const { id } = await params;
  const s = await getOwnSubmission(id, user.id);
  if (!s) notFound();
  if (s.status !== "DRAFT") redirect(`/me/submissions/${s.id}`);

  const { drive } = s;
  const visits = await visitsThatYear(drive.companyId, drive.year);
  const closed = drive.verified && drive.status === "CLOSED";
  const rounds = drive.rounds.filter((r) => roundIsFor(r, s.role));
  const current = rounds.find((r) => r.id === s.roundId);
  const sections = Array.isArray(s.sections)
    ? (s.sections as { name: string; count: number | null }[])
    : [];

  const initial: RoundInitial = {
    roundId: s.roundId,
    roundType: current?.type ?? "OA",
    testDate: day(s.testDate),
    platform: s.platform ?? "",
    durationMin: s.durationMin ? String(s.durationMin) : "",
    sections: sections.map((x) => ({
      name: x.name,
      count: x.count === null ? "" : String(x.count),
    })),
    notes: s.notes ?? "",
    method: s.mode === "SCAN" ? "scan" : "type",
  };

  return (
    <>
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
        {closed ? (
          <div className="flex flex-col gap-3 border-t-3 border-crimson bg-peach px-5 py-4.5">
            <strong>
              This drive is closed, so submissions are switched off.
            </strong>
            <span className="text-[15px]">
              Your draft is kept. If you think this is a mistake, contact the
              CDC.
            </span>
            <Link href="/help" className="font-bold">
              Read the help page
            </Link>
          </div>
        ) : (
          <RoundForm
            submissionId={s.id}
            rounds={rounds.map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              date: day(r.date) || null,
              platform: r.platform,
              durationMin: r.durationMin,
              verified: r.verified,
            }))}
            initial={initial}
          />
        )}
      </div>
      <aside className="flex flex-[1_1_300px] flex-col gap-7">
        <section className="flex flex-col gap-3 border-t-4 border-charcoal bg-grey-band p-6">
          <h2 className="text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
            Your submission
          </h2>
          <dl className="flex flex-col gap-2.5 text-[15px]">
            <div>
              <dt className="text-sm text-ink-3">Company</dt>
              <dd className="font-bold">{drive.company.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">Drive</dt>
              <dd className="font-bold">
                {[driveLabel(drive.year, drive.sequence, visits), s.role]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
            {!drive.verified && (
              <div>
                <dt className="text-sm text-ink-3">Status</dt>
                <dd>Added by you · the CDC will check it</dd>
              </div>
            )}
          </dl>
          <Link href="/submit" className="text-[15px] font-bold">
            Change drive
          </Link>
        </section>
      </aside>
    </>
  );
}
