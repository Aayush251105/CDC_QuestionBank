import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveHeader } from "@/components/admin/DriveHeader";
import {
  PageHead,
  pinTone,
  submissionTag,
  Tag,
  table,
} from "@/components/admin/ui";
import { daysAgo, toDateInput } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import { formatPin } from "@/lib/pin";
import { getDriveHeader } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { getPinUsage } from "@/server/admin/pin";
import {
  CopyPinButton,
  GeneratePinButton,
  PinActions,
  ShareMessage,
} from "./PinControls";

export const metadata: Metadata = {
  title: "Drive PIN · Admin · Placement Question Bank",
};

// A05 Drive PIN: generate, share, regenerate or switch off the PIN, and see
// how it is being used. PINs are 6 digits (CLAUDE.md 2a.6, 2a.9).
export default function DrivePinPage({
  params,
}: PageProps<"/admin/drives/[id]/pin">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Drive PIN" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={5} />
          </div>
        </>
      }
    >
      <DrivePin params={params} />
    </Suspense>
  );
}

async function DrivePin({
  params,
}: {
  params: PageProps<"/admin/drives/[id]/pin">["params"];
}) {
  await requireAdmin();
  const { id } = await params;
  const drive = await getDriveHeader(id);
  const usage = await getPinUsage(id, drive.submissionPin);
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  const pin = drive.submissionPin ? formatPin(drive.submissionPin) : null;
  const until = drive.closesAt ? fullDate(drive.closesAt) : null;
  const stateLabel =
    drive.pin === "Active" && until ? `Active until ${until}` : drive.pin;

  return (
    <>
      <DriveHeader drive={drive} tab="pin" />
      <div className="flex flex-col gap-9 px-5 pt-7 pb-12 sm:px-8">
        {!pin ? (
          <section className="flex max-w-190 flex-col gap-3.5 border-t-4 border-charcoal pt-5.5">
            <h2 className="text-2xl font-bold">This drive has no PIN yet</h2>
            <p className="text-ink-2">
              {drive.requirePin
                ? `Because "Require a PIN" is on, students cannot submit to this drive until you generate one.`
                : `"Require a PIN" is off for this drive, so a PIN is optional.`}{" "}
              The PIN covers every round
              {drive.opensAt && until
                ? ` and works from ${fullDate(drive.opensAt)} to ${until}.`
                : "."}
            </p>
            <GeneratePinButton driveId={id} />
          </section>
        ) : (
          <>
            <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
              <section
                aria-labelledby="pin-h"
                className="flex flex-col gap-3.5 border-t-4 border-charcoal pt-4.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <h2 id="pin-h" className="eyebrow">
                    Drive PIN
                  </h2>
                  <Tag tone={pinTone[drive.pin]}>{stateLabel}</Tag>
                </div>
                <div className="flex flex-wrap items-center gap-4.5">
                  <span className="font-mono text-[56px] leading-none font-medium tracking-[0.16em]">
                    {pin}
                  </span>
                  <CopyPinButton driveId={id} pin={drive.submissionPin!} />
                </div>
                <p className="text-sm text-ink-3">
                  {usage.generated
                    ? `Generated ${fullDate(usage.generated.createdAt)} by ${usage.generated.admin.name}. `
                    : drive.pinCreatedAt
                      ? `Generated ${fullDate(drive.pinCreatedAt)}. `
                      : ""}
                  Students type the 6 digits; spaces are optional.
                </p>
                <PinActions
                  driveId={id}
                  pin={pin}
                  enabled={drive.pinEnabled}
                  submissions={usage.submissions}
                  opensAt={toDateInput(drive.opensAt)}
                  closesAt={toDateInput(drive.closesAt)}
                />
              </section>

              <section
                aria-labelledby="us-h"
                className="flex flex-col gap-3.5 bg-grey-band p-5.5"
              >
                <h2 id="us-h" className="text-lg font-bold">
                  How it is being used
                </h2>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-[15px]">
                  <dt>Students who entered it</dt>
                  <dd className="font-bold">{usage.students}</dd>
                  <dt>Submissions made with it</dt>
                  <dd className="font-bold">{usage.submissions}</dd>
                  <dt>Entered by students not on the shortlist</dt>
                  <dd
                    className={`font-bold ${usage.outsiderCount ? "text-crimson" : ""}`}
                  >
                    {usage.outsiderCount}
                  </dd>
                  <dt>Refused tries in the last 7 days</dt>
                  <dd className="font-bold">{usage.wrongTries}</dd>
                  <dt>Students paused after 5 wrong tries</dt>
                  <dd className="font-bold">{usage.paused}</dd>
                </dl>
                {usage.outsiderCount > 0 && (
                  <p className="bg-peach px-3.5 py-3 text-sm">
                    <strong>
                      {usage.outsiderCount === 1
                        ? "1 person outside the shortlist used this PIN."
                        : `${usage.outsiderCount} people outside the shortlist used this PIN.`}
                    </strong>{" "}
                    If that keeps rising, regenerate it and share the new one
                    with the shortlist.
                  </p>
                )}
              </section>
            </div>

            <section
              aria-labelledby="sh-h"
              className="flex max-w-225 flex-col gap-3.5"
            >
              <h2
                id="sh-h"
                className="border-b-2 border-charcoal pb-2 text-xl font-bold"
              >
                Share with the shortlist
              </h2>
              <ShareMessage
                key={drive.submissionPin}
                driveName={drive.title.replace(/ · /g, " ")}
                pin={pin}
                until={until}
                site={site}
              />
            </section>

            <section aria-labelledby="ff-h" className="flex flex-col gap-2.5">
              <h2 id="ff-h" className="text-xl font-bold">
                Used by people not on the shortlist
              </h2>
              {usage.outsiders.length === 0 ? (
                <p className="text-ink-3">
                  Everyone who used this PIN is on the shortlist for their
                  round, or has not been checked yet.
                </p>
              ) : (
                <div className={table.wrap}>
                  <table className={table.table}>
                    <thead>
                      <tr>
                        <th scope="col" className={table.th}>
                          Student
                        </th>
                        <th scope="col" className={table.th}>
                          Round they submitted for
                        </th>
                        <th scope="col" className={table.th}>
                          When
                        </th>
                        <th scope="col" className={table.th}>
                          Submission
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.outsiders.map((s) => {
                        const u = s.user;
                        const sent = s.submittedAt ?? s.createdAt;
                        const age = daysAgo(sent);
                        return (
                          <tr key={s.id} className={table.row}>
                            <td className={table.td}>
                              <Link
                                href={`/admin/students?q=${encodeURIComponent(u.rollNo ?? u.email)}`}
                                className={table.rowLink}
                              >
                                {u.name}
                              </Link>
                              <div className="text-[13px] text-ink-3">
                                {[
                                  u.rollNo,
                                  [u.programme, u.branch, u.gradYear]
                                    .filter(Boolean)
                                    .join(" "),
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || u.email}
                              </div>
                            </td>
                            <td className={table.td}>{s.round.name}</td>
                            <td className={`${table.td} text-sm text-ink-3`}>
                              {age.endsWith("days") ? `${age} ago` : age}
                            </td>
                            <td className={table.td}>
                              <Link
                                href={`/admin/drives/${id}/review/${s.id}`}
                                className="font-bold"
                              >
                                {submissionTag[s.status].label}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
