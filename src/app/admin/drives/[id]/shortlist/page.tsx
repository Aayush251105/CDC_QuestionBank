import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveHeader } from "@/components/admin/DriveHeader";
import { PageHead } from "@/components/admin/ui";
import { fullDate } from "@/lib/labels";
import { getDriveHeader } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";
import { getShortlistPage } from "@/server/admin/shortlist";
import { ShortlistUploader } from "./ShortlistUploader";

export const metadata: Metadata = {
  title: "Shortlist · Admin · Placement Question Bank",
};

// A06 Shortlist upload: upload the CSV, match columns, preview, import.
export default function ShortlistPage({
  params,
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
      <Shortlist params={params} />
    </Suspense>
  );
}

async function Shortlist({
  params,
}: {
  params: PageProps<"/admin/drives/[id]/shortlist">["params"];
}) {
  await requireAdmin();
  const { id } = await params;
  const drive = await getDriveHeader(id);
  const { rounds, uploads } = await getShortlistPage(id);

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
      </div>
    </>
  );
}
