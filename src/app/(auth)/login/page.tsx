import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/Wordmark";
import { parseDomains } from "@/lib/access";
import {
  devSignIn,
  signInWithGoogle,
  signInWithMicrosoft,
} from "@/server/actions/auth";
import { getCurrentUser, signInOptions } from "@/server/auth";
import { db } from "@/server/db";
import { getSiteStats } from "@/server/queries/stats";

export const metadata: Metadata = {
  title: "Sign in · Placement Question Bank",
};

const domain =
  parseDomains(process.env.ALLOWED_EMAIL_DOMAINS)[0] ?? "snu.edu.in";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>

      <section className="flex flex-col justify-between gap-12 bg-charcoal px-6 py-12 text-cream sm:px-14 lg:flex-1">
        <Wordmark tone="light" title="Career Development Centre" />
        <div className="flex max-w-130 flex-col gap-4.5">
          <p className="text-[13px] font-bold tracking-[0.14em] text-amber uppercase">
            Placement Question Bank
          </p>
          <h1 className="text-4xl leading-[1.08] font-bold tracking-[-0.01em] text-white sm:text-5xl">
            Prepare with questions from real SNU drives.
          </h1>
          <p className="text-lg leading-relaxed font-light">
            Shared by students who sat the test. Checked by the CDC before
            anyone sees them.
          </p>
        </div>
        <Suspense fallback={<StatsGrid />}>
          <Stats />
        </Suspense>
      </section>

      <main className="flex flex-auto items-start justify-center px-6 py-12 sm:px-8 lg:flex-1 lg:items-center">
        <div className="flex w-full max-w-100 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
              Students and CDC staff
            </p>
            <h2 className="text-[32px] leading-tight font-bold">Sign in</h2>
            <p className="text-ink-2">
              Use your @{domain} account, the same address you use for SNU
              email.
            </p>
          </div>

          <Suspense>
            <SignInAlert searchParams={searchParams} />
          </Suspense>

          <div className="flex flex-col gap-3">
            {signInOptions.google && (
              <form action={signInWithGoogle}>
                <SignInButton>Sign in with Google</SignInButton>
              </form>
            )}
            {signInOptions.microsoft && (
              <form action={signInWithMicrosoft}>
                <SignInButton>Sign in with Microsoft</SignInButton>
              </form>
            )}
            {!signInOptions.google &&
              !signInOptions.microsoft &&
              !signInOptions.devLogin && (
                <p className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]">
                  Sign-in is not set up yet. Please try again later.
                </p>
              )}
          </div>

          <p className="border-t border-line pt-4 text-sm text-ink-2">
            We never see your password. Only @{domain} accounts can sign in.
            Trouble?{" "}
            <a href="/help" className="font-bold">
              Read the help page
            </a>
            .
          </p>

          {signInOptions.devLogin && (
            <Suspense>
              <DevLogin />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/");
  return null;
}

async function Stats() {
  return <StatsGrid stats={await getSiteStats()} />;
}

function StatsGrid({
  stats,
}: {
  stats?: { companies: number; questions: number; drives: number };
}) {
  const items = [
    ["Companies", stats?.companies],
    ["Questions", stats?.questions],
    ["Drives covered", stats?.drives],
  ] as const;
  return (
    <dl className="grid grid-cols-3 gap-4 border-t border-white/25 pt-5">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[13px] text-cream">{label}</dt>
          <dd className="text-[28px] font-bold text-white">
            {value ?? <span className="text-white/40">–</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function SignInAlert({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const state = typeof params.state === "string" ? params.state : null;
  // Auth.js adds ?error=AccessDenied when a sign-in is refused.
  const error = typeof params.error === "string" ? params.error : null;

  if (state === "wrong-account" || error === "AccessDenied") {
    return (
      <div
        role="alert"
        className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
      >
        <strong className="block">That account is not an SNU account.</strong>
        Choose a different account in the sign-in window, then sign in with your
        @{domain} address.
      </div>
    );
  }
  if (state === "error" || error) {
    return (
      <div
        role="alert"
        className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
      >
        <strong className="block">Sign-in did not work.</strong>
        Please try again. If it keeps happening, contact the CDC.
      </div>
    );
  }
  return null;
}

function SignInButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.5 border border-crimson bg-crimson px-6 font-bold text-white hover:border-crimson-dark hover:bg-crimson-dark"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      >
        <path d="M10 17l5-5-5-5M15 12H3M15 3h6v18h-6" />
      </svg>
      {children}
    </button>
  );
}

// Development only (DEV_LOGIN=true under `pnpm dev`): pick a seeded user.
async function DevLogin() {
  const users = await db.user.findMany({
    select: { email: true, name: true, role: true },
    orderBy: [{ role: "desc" }, { name: "asc" }],
  });
  return (
    <form
      action={devSignIn}
      className="flex flex-col gap-3 border border-dashed border-line-strong p-4"
    >
      <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">
        Development only
      </p>
      <label htmlFor="dev-email" className="text-sm font-bold">
        Sign in as a seeded user
      </label>
      <select
        id="dev-email"
        name="email"
        className="min-h-11 border border-line-strong bg-white px-3"
      >
        {users.map((u) => (
          <option key={u.email} value={u.email}>
            {u.name} · {u.email}
            {u.role === "STUDENT" ? "" : ` (${u.role.toLowerCase()})`}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="min-h-11 cursor-pointer border border-charcoal bg-white px-4 font-bold hover:bg-grey-band"
      >
        Sign in
      </button>
    </form>
  );
}
