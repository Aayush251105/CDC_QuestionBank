import type { Metadata } from "next";
import Link from "next/link";
import { ErrorPage } from "@/components/ErrorPage";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Page not found · Placement Question Bank",
};

export default function NotFound() {
  return (
    <SiteShell>
      <ErrorPage
        code="404"
        eyebrow="Page not found"
        title="We could not find that page"
        body="The link may be old, or the question may have been moved to another round. Try searching for it instead."
        action={
          <Link href="/search" className="btn-primary">
            Search questions
          </Link>
        }
        footer={
          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4.5">
            <span className="lbl">Or go to</span>
            <span className="flex flex-wrap gap-x-6 gap-y-2 font-bold">
              <Link href="/companies">Companies</Link>
              <Link href="/search">Search</Link>
              <Link href="/me/submissions">My submissions</Link>
            </span>
          </div>
        }
      />
    </SiteShell>
  );
}
