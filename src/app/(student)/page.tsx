import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusTag } from "@/components/StatusTag";
import { signOutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";
import { ToastCheck } from "./ToastCheck";

// Placeholder until step 5 (Home): shows the shared pieces from step 4.
export default function Home() {
  return (
    <div className="wrap flex flex-col gap-8 py-14">
      <Breadcrumbs
        items={[
          { label: "Companies", href: "/companies" },
          { label: "Amazon", href: "/companies/amazon" },
          { label: "2025", href: "/companies/amazon?year=2025" },
          { label: "Online assessment" },
        ]}
      />
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Career Development Centre · Shiv Nadar</p>
        <h1 className="text-[44px] leading-tight font-bold">
          Placement Question Bank
        </h1>
        <Suspense fallback={<p className="text-ink-3">Loading…</p>}>
          <SignedIn />
        </Suspense>
      </div>
      <div className="flex flex-col gap-3">
        <span className="lbl">Status tags students can see</span>
        <div className="flex flex-wrap gap-3">
          <StatusTag status="DRAFT" />
          <StatusTag status="PROCESSING" />
          <StatusTag status="PENDING_REVIEW" />
          <StatusTag status="PUBLISHED" />
          <StatusTag status="NOT_PUBLISHED" />
          <StatusTag status="WITHDRAWN" />
        </div>
      </div>
      <ToastCheck />
    </div>
  );
}

async function SignedIn() {
  const user = await requireUser();
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="max-w-190 text-lg font-light text-ink-2">
        Signed in as <strong className="font-bold">{user.name}</strong> (
        {user.email}, {user.role.toLowerCase()}). Pages are built from the
        designs in the next steps.
      </p>
      <form action={signOutAction}>
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}
