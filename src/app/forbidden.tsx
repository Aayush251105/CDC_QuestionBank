import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorPage } from "@/components/ErrorPage";
import { SiteShell } from "@/components/site/SiteShell";
import { signOutAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Access denied · Placement Question Bank",
};

// Shown by requireRole() via forbidden(). Signing in with a non-SNU account
// never gets this far (the sign-in page turns it away), so the copy is about
// pages a signed-in student is not allowed to open.
export default function Forbidden() {
  return (
    <SiteShell>
      <ErrorPage
        code="403"
        eyebrow="Access denied"
        title="You do not have access to this page"
        body="This page is for CDC staff. If you think you should be able to see it, sign in with a different account or contact the CDC."
        action={
          <form action={signOutAction}>
            <button type="submit" className="btn-primary">
              Sign in with a different account
            </button>
          </form>
        }
      >
        <Suspense>
          <SignedInAs />
        </Suspense>
      </ErrorPage>
    </SiteShell>
  );
}

async function SignedInAs() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <p className="border-l-3 border-charcoal bg-grey-band px-4.5 py-3.5 text-[15px]">
      You are signed in as <strong>{user.email}</strong>.
    </p>
  );
}
