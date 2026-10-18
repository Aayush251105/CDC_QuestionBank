import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead } from "@/components/admin/ui";
import { toDateInput, type RoundTypeKey } from "@/lib/admin";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";
import { DriveForm, type DriveFormValues } from "@/components/admin/DriveForm";

export const metadata: Metadata = {
  title: "New drive · Admin · Placement Question Bank",
};

const crumbs = (
  <Breadcrumbs
    items={[{ label: "Drives", href: "/admin/drives" }, { label: "New drive" }]}
  />
);

// A03 New drive. With ?request=<id> it starts from a student's drive
// request (A02 Requests) and moves their submissions onto the new drive.
export default function NewDrivePage({
  searchParams,
}: PageProps<"/admin/drives/new">) {
  return (
    <>
      <PageHead
        crumbs={crumbs}
        title="New drive"
        intro="Set up the company visit. You can add rounds later as the company confirms them."
      />
      <Suspense
        fallback={
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        }
      >
        <NewDrive searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewDrive({
  searchParams,
}: {
  searchParams: PageProps<"/admin/drives/new">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const requestId = typeof params.request === "string" ? params.request : null;

  const [companies, request] = await Promise.all([
    db.company.findMany({
      where: { verified: true, mergedIntoId: null },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    requestId
      ? db.drive.findFirst({
          where: { id: requestId, verified: false, requestResolvedAt: null },
          select: {
            id: true,
            year: true,
            roles: true,
            company: { select: { name: true } },
            createdBy: { select: { name: true } },
            rounds: {
              orderBy: { order: "asc" },
              select: {
                type: true,
                date: true,
                platform: true,
                durationMin: true,
              },
            },
          },
        })
      : null,
  ]);

  const thisYear = new Date().getUTCFullYear();
  const initial: DriveFormValues = request
    ? {
        requestId: request.id,
        company: request.company.name,
        year: request.year,
        roles: request.roles.join(", "),
        rounds: request.rounds.map((r) => ({
          type: r.type as RoundTypeKey,
          date: toDateInput(r.date),
          platform: r.platform ?? "",
          durationMin: r.durationMin ? String(r.durationMin) : "",
        })),
      }
    : {
        requestId: null,
        company: "",
        year: thisYear,
        roles: "",
        rounds: [{ type: "OA", date: "", platform: "", durationMin: "" }],
      };

  return (
    <>
      {request && (
        <p className="mx-5 mt-7 max-w-230 bg-peach px-4 py-3 text-[15px] sm:mx-8">
          <strong>From a drive request</strong> by{" "}
          {request.createdBy?.name ?? "a student"}. Check the details, then
          create the drive: their submissions move onto its rounds, in order.
        </p>
      )}
      <DriveForm
        mode="create"
        initial={initial}
        companies={companies.map((c) => c.name)}
        years={[thisYear - 1, thisYear, thisYear + 1]}
      />
    </>
  );
}
