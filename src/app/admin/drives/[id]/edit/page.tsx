import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkeletonRows } from "@/components/Skeleton";
import { DriveForm } from "@/components/admin/DriveForm";
import { PageHead } from "@/components/admin/ui";
import { driveTitle, toDateInput, type RoundTypeKey } from "@/lib/admin";
import { getDriveForEdit } from "@/server/admin/drive";
import { requireAdmin } from "@/server/admin/guard";

export const metadata: Metadata = {
  title: "Edit drive · Admin · Placement Question Bank",
};

// Edit drive (button on A04), using the A03 form. Company and year are fixed.
export default function EditDrivePage({
  params,
}: PageProps<"/admin/drives/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead title="Edit drive" />
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <EditDrive params={params} />
    </Suspense>
  );
}

async function EditDrive({
  params,
}: {
  params: PageProps<"/admin/drives/[id]/edit">["params"];
}) {
  await requireAdmin();
  const { id } = await params;
  const d = await getDriveForEdit(id);
  const title = driveTitle(d);

  return (
    <>
      <PageHead
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Drives", href: "/admin/drives" },
              {
                label: title.replace(/ · /g, " "),
                href: `/admin/drives/${id}`,
              },
              { label: "Edit" },
            ]}
          />
        }
        title="Edit drive"
        intro={title}
      />
      <DriveForm
        mode="edit"
        initial={{
          driveId: d.id,
          requestId: null,
          company: d.company.name,
          year: d.year,
          season: d.season ?? undefined,
          roles: d.roles.join(", "),
          ctcBand: d.ctcBand ?? "",
          eligibility: d.eligibility ?? "",
          opensAt: toDateInput(d.opensAt),
          closesAt: toDateInput(d.closesAt),
          requirePin: d.requirePin,
          rounds: d.rounds.map((r) => ({
            id: r.id,
            locked:
              r._count.submissions +
                r._count.questions +
                r._count.shortlistUploads >
              0,
            type: r.type as RoundTypeKey,
            date: toDateInput(r.date),
            platform: r.platform ?? "",
            durationMin: r.durationMin ? String(r.durationMin) : "",
          })),
        }}
      />
    </>
  );
}
