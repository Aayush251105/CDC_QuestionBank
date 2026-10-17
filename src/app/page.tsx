import { Suspense } from "react";
import { signOutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";

// Placeholder until step 5 (Home). Shows who is signed in so step 3 can be checked.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-275 flex-col gap-3 px-6 py-14">
      <p className="text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
        Career Development Centre · Shiv Nadar
      </p>
      <h1 className="text-[44px] leading-tight font-bold">
        Placement Question Bank
      </h1>
      <Suspense fallback={<p className="text-ink-3">Loading…</p>}>
        <SignedIn />
      </Suspense>
    </main>
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
        <button
          type="submit"
          className="min-h-11 cursor-pointer border border-line-strong px-4 font-bold hover:bg-grey-band"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
