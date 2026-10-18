import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHead } from "@/components/admin/ui";
import { requireAdmin } from "@/server/admin/guard";
import { drivesWithPending } from "@/server/admin/review";

export const metadata: Metadata = {
  title: "Review queue · Admin · Placement Question Bank",
};

// Sidebar "Review queue": opens the batch of the drive with the oldest
// waiting submission.
export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<PageHead eyebrow="Drives" title="Review queue" />}>
      <ReviewQueue />
    </Suspense>
  );
}

async function ReviewQueue() {
  await requireAdmin();
  const drives = await drivesWithPending();
  if (drives[0]) redirect(`/admin/drives/${drives[0].id}/review`);
  return (
    <>
      <PageHead
        eyebrow="Drives"
        title="Review queue"
        intro="Nothing is waiting for review. New submissions show up here."
      />
      <div className="px-5 pt-7 pb-12 sm:px-8">
        <Link href="/admin/drives" className="btn-secondary">
          See all drives
        </Link>
      </div>
    </>
  );
}
