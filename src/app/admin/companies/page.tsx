import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead } from "@/components/admin/ui";
import { getCompanyAdminList } from "@/server/admin/companies";
import { requireAdmin } from "@/server/admin/guard";
import { AddCompany, CompanySearch, CompanyTable } from "./CompanyTable";

export const metadata: Metadata = {
  title: "Companies · Admin · Placement Question Bank",
};

const intro =
  "Names students see and search by. Aliases catch other spellings, so AWS and Amazon Web Services land on one page.";

// A10 Companies: create and edit companies and aliases; merge duplicates.
export default function CompaniesPage({
  searchParams,
}: PageProps<"/admin/companies">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead eyebrow="Content" title="Companies" intro={intro} />
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={8} />
          </div>
        </>
      }
    >
      <Companies searchParams={searchParams} />
    </Suspense>
  );
}

async function Companies({
  searchParams,
}: {
  searchParams: PageProps<"/admin/companies">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const { rows, sectors, all } = await getCompanyAdminList(q);

  return (
    <>
      <PageHead
        eyebrow="Content"
        title="Companies"
        intro={intro}
        actions={<AddCompany sectors={sectors} />}
      />
      <div className="flex flex-col gap-5 px-5 pt-6 pb-12 sm:px-8">
        <CompanySearch />
        <CompanyTable rows={rows} sectors={sectors} all={all} />
      </div>
    </>
  );
}
