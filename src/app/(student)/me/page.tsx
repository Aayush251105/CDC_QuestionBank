import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { signOutAction } from "@/server/actions/auth";
import { auth, requireUser } from "@/server/auth";
import { getSubmissionCounts } from "@/server/queries/me";
import { CreditToggle } from "./CreditToggle";

export const metadata: Metadata = {
  title: "Profile · Placement Question Bank",
};

const signInMethod: Record<string, string> = {
  google: "Google (@snu.edu.in account)",
  "microsoft-entra-id": "Microsoft (SNU account)",
  "dev-login": "Dev login (development only)",
};

// Page 12. No "Email me when" section: the portal sends no emails
// (CLAUDE.md 2a.2), and no outcome counts.
export default function ProfilePage() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9 pb-8">
          <p className="eyebrow">Your account</p>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
            Profile and settings
          </h1>
          <p className="text-ink-2">
            Your details come from your SNU account and the CDC&apos;s records.
            To change them, contact the CDC.
          </p>
        </div>
      </section>
      <div className="wrap grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-12 pt-9 pb-18">
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <Profile />
        </Suspense>
      </div>
    </>
  );
}

async function Profile() {
  const user = await requireUser();
  const [session, counts] = await Promise.all([
    auth(),
    getSubmissionCounts(user.id),
  ]);
  const notOnRecord = <span className="text-ink-3">Not on record yet</span>;
  const programme = [
    [user.programme, user.branch].filter(Boolean).join(" "),
    user.gradYear ? `Batch of ${user.gradYear}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section aria-labelledby="me-h" className="flex flex-col gap-3">
        <h2
          id="me-h"
          className="border-b-2 border-charcoal pb-2.5 text-[22px] font-bold"
        >
          Your details
        </h2>
        <dl className="grid grid-cols-[130px_1fr] gap-x-5 gap-y-3.5 text-[15px] sm:grid-cols-[150px_1fr]">
          <dt className="lbl pt-0.5">Name</dt>
          <dd>{user.name}</dd>
          <dt className="lbl pt-0.5">SNU email</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="lbl pt-0.5">Roll number</dt>
          <dd>{user.rollNo ?? notOnRecord}</dd>
          <dt className="lbl pt-0.5">Programme</dt>
          <dd>{programme || notOnRecord}</dd>
          <dt className="lbl pt-0.5">Signed in with</dt>
          <dd>{signInMethod[session?.user.provider ?? ""] ?? "SNU account"}</dd>
        </dl>
        <div className="mt-4 grid grid-cols-3 border-y border-line">
          {[
            [counts.shared, "Rounds shared"],
            [counts.inReview, "In review"],
            [counts.reviewed, "Reviewed"],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col py-4">
              <span className="text-[30px] font-bold">{n}</span>
              <span className="text-sm text-ink-3">{label}</span>
            </div>
          ))}
        </div>
        <Link href="/me/submissions" className="font-bold">
          See my submissions
        </Link>
      </section>

      <div className="flex flex-col gap-10">
        <section aria-labelledby="c-h" className="flex flex-col gap-3">
          <h2
            id="c-h"
            className="border-b-2 border-charcoal pb-2.5 text-[22px] font-bold"
          >
            Credit
          </h2>
          <CreditToggle initial={user.creditByDefault} />
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 bg-grey-band p-5.5">
          <span className="max-w-90 text-[15px]">
            Signing out here also signs you out of the question bank on this
            device.
          </span>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
