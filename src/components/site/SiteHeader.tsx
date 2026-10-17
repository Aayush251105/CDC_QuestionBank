import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/Wordmark";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { NavLinks } from "./NavLinks";

// Thin charcoal strip, then the white bar with the logo and main nav (snu.edu.in style).
export function SiteHeader() {
  return (
    <>
      <a
        href="#main"
        className="sr-only bg-charcoal px-4 py-2 text-white focus:not-sr-only focus:absolute focus:z-50"
      >
        Skip to content
      </a>
      <div className="bg-charcoal text-[13px] text-cream">
        <div className="wrap flex flex-wrap justify-between gap-x-5 gap-y-1.5 py-2">
          <span>
            Career Development Centre · Shiv Nadar Institution of Eminence
          </span>
          <span className="flex gap-5">
            <Link
              href="/help"
              className="text-cream no-underline hover:text-white hover:underline"
            >
              Help
            </Link>
            <Suspense>
              <UserLinks />
            </Suspense>
          </span>
        </div>
      </div>
      <header className="border-b border-line bg-white">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-8">
          <Link href="/" className="py-3.5 no-underline">
            <Wordmark
              title="Placement Question Bank"
              subtitle="Career Development Centre"
            />
          </Link>
          <NavLinks />
        </div>
      </header>
    </>
  );
}

async function UserLinks() {
  const user = await getCurrentUser();
  const linkClass = "text-cream no-underline hover:text-white hover:underline";
  if (!user) {
    return (
      <Link href="/login" className={linkClass}>
        Sign in
      </Link>
    );
  }
  const unread = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return (
    <>
      {/* The notifications page comes with the bell in step 17. */}
      <Link href="/me/submissions" className={linkClass}>
        Notifications{unread > 0 ? ` (${unread})` : ""}
      </Link>
      <Link href="/me" className={linkClass}>
        {user.name}
      </Link>
    </>
  );
}
