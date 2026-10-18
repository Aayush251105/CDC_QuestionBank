import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveHeader } from "@/components/admin/DriveHeader";
import { PageHead } from "@/components/admin/ui";
import { daysAgo, reminderMessage } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import { formatPin } from "@/lib/pin";
import { getDriveHeader } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { getNotSubmitted } from "@/server/admin/reminders";
import { getShortlistPage } from "@/server/admin/shortlist";
import { mailEnabled, mailFrom } from "@/server/mail";
import { ReminderPanel } from "./ReminderPanel";
import { ShortlistUploader } from "./ShortlistUploader";

export const metadata: Metadata = {
  title: "Shortlist · Admin · Placement Question Bank",
};

const pad = (n: number) => String(n).padStart(2, "0");

// A06 Shortlist upload: upload the CSV, match columns, preview, import.
// Below it, reminders for shortlisted students who have not submitted
// (CLAUDE.md 2a.11).
export default function ShortlistPage({
  params,
  searchParams,
}: PageProps<"/admin/drives/[id]/shortlist">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Shortlist" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={5} />
          </div>
        </>
      }
    >
      <Shortlist params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Shortlist({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/drives/[id]/shortlist">["params"];
  searchParams: PageProps<"/admin/drives/[id]/shortlist">["searchParams"];
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const drive = await getDriveHeader(id);
  const { rounds, uploads } = await getShortlistPage(id);

  // Reminders: rounds that have a shortlist, the chosen one first.
  const listed = rounds.filter((r) => uploads.some((u) => u.round === r.order));
  const remindRound =
    listed.find((r) => r.id === sp.remind) ?? listed[0] ?? null;
  const notSubmitted = remindRound
    ? await getNotSubmitted(remindRound.id)
    : null;
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const message = remindRound
    ? reminderMessage({
        drive: drive.title.replace(/ · /g, " "),
        round: remindRound.name,
        site,
        pin:
          drive.pin === "Active" && drive.submissionPin
            ? formatPin(drive.submissionPin)
            : null,
        until: drive.closesAt ? fullDate(drive.closesAt) : null,
      })
    : null;

  return (
    <>
      <DriveHeader drive={drive} tab="shortlist" />
      <div className="flex max-w-250 flex-col gap-9 px-5 pt-7 pb-12 sm:px-8">
        <ShortlistUploader driveId={id} rounds={rounds} />

        <section aria-labelledby="h-h" className="flex flex-col">
          <h2 id="h-h" className="mb-2 text-lg font-bold">
            Earlier uploads
          </h2>
          {uploads.length === 0 && (
            <p className="border-t border-line py-2.5 text-sm text-ink-3">
              No shortlist uploaded for this drive yet.
            </p>
          )}
          {uploads.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[180px_1fr_auto] gap-4 border-t border-line py-2.5 text-sm"
            >
              <span>
                Round {u.round} · {u.rows} rows
              </span>
              <span className="text-ink-3">
                {u.fileName} · {fullDate(u.createdAt)} by {u.by} ·{" "}
                {u.rows - u.unmatched} matched, {u.unmatched} unmatched
              </span>
              <a
                href={`/admin/drives/${id}/shortlist/${u.id}`}
                className="font-bold"
              >
                Download
              </a>
            </div>
          ))}
        </section>

        <section
          id="remind"
          aria-labelledby="rm-h"
          className="flex scroll-mt-4 flex-col gap-3.5"
        >
          <h2
            id="rm-h"
            className="border-b-2 border-charcoal pb-2 text-xl font-bold"
          >
            Not submitted yet
          </h2>
          <p className="text-ink-3">
            Shortlisted students who have not shared their questions for a
            round. Email them a reminder as often as needed; they leave this
            list as soon as they submit.
          </p>
          {remindRound && notSubmitted && message ? (
            <ReminderPanel
              key={remindRound.id}
              driveId={id}
              roundId={remindRound.id}
              rounds={listed.map((r) => ({
                id: r.id,
                label: `${pad(r.order)} · ${r.name}`,
              }))}
              pending={notSubmitted.pending.map((p) => {
                const age = p.lastReminded ? daysAgo(p.lastReminded) : null;
                return {
                  email: p.email,
                  name: p.name,
                  rollNo: p.rollNo,
                  hasAccount: p.hasAccount,
                  reminders: p.reminders,
                  lastReminded:
                    age === null
                      ? null
                      : age.endsWith("days")
                        ? `${age} ago`
                        : age.toLowerCase(),
                };
              })}
              noEmail={notSubmitted.noEmail}
              submitted={notSubmitted.submitted}
              mailEnabled={mailEnabled}
              mailFrom={mailFrom}
              defaultSubject={message.subject}
              defaultText={message.text}
            />
          ) : (
            <p className="text-sm text-ink-3">
              Upload a shortlist first; reminders go to the students on it.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
