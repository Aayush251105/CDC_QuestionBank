import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowButton } from "@/components/FollowButton";
import { SkeletonRows } from "@/components/Skeleton";
import {
  filterCompanies,
  monthYear,
  parseCompanyFilters,
} from "@/lib/companies";
import { plural } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import {
  getCompanyList,
  getFollowedCompanyIds,
} from "@/server/queries/companies";
import { CompanyFilterBar } from "./CompanyFilterBar";

export const metadata: Metadata = {
  title: "Companies · Placement Question Bank",
};

// Page 03. Filters live in the URL so Back restores them and links can be shared.
export default function CompaniesPage({
  searchParams,
}: PageProps<"/companies">) {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-11 pb-9">
          <p className="eyebrow">Directory</p>
          <h1 className="text-[34px] leading-[1.1] font-bold sm:text-[42px]">
            Companies
          </h1>
          <p className="max-w-160 text-lg font-light text-ink-2">
            Every company that has held a placement drive at SNU, with the
            rounds and questions students have shared.
          </p>
        </div>
      </section>
      <div className="wrap flex flex-col gap-6 pt-8 pb-16">
        <Suspense fallback={<SkeletonRows rows={8} />}>
          <Companies searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

// Sectors in the design's order; any new sector goes after them.
const SECTOR_ORDER = [
  "Software",
  "Finance",
  "Consulting",
  "Analytics",
  "Core engineering",
];

async function Companies({
  searchParams,
}: {
  searchParams: PageProps<"/companies">["searchParams"];
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseCompanyFilters(params);
  const [all, followed] = await Promise.all([
    getCompanyList(),
    getFollowedCompanyIds(user.id),
  ]);

  const rows = filterCompanies(all, filters);
  const years = [...new Set(all.flatMap((c) => c.years))].sort((a, b) => b - a);
  const sectors = [
    ...new Set(all.flatMap((c) => (c.sector ? [c.sector] : []))),
  ].sort(
    (a, b) =>
      (SECTOR_ORDER.indexOf(a) + 1 || 99) -
        (SECTOR_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b),
  );

  // Keep the other filters when switching sector.
  const sectorHref = (sector?: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k !== "sector" && typeof v === "string" && v) next.set(k, v);
    }
    if (sector) next.set("sector", sector);
    const query = next.toString();
    return query ? `/companies?${query}` : "/companies";
  };

  return (
    <>
      <CompanyFilterBar years={years} />

      <nav aria-label="Sector" className="flex flex-wrap border-b border-line">
        {[undefined, ...sectors].map((s) => {
          const active = filters.sector === s;
          return (
            <Link
              key={s ?? "all"}
              href={sectorHref(s)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`mr-6 flex min-h-11.5 items-center border-b-2 px-0.5 text-[15px] font-bold no-underline ${
                active
                  ? "border-crimson text-crimson"
                  : "border-transparent text-ink-2 hover:text-charcoal"
              }`}
            >
              {s ?? "All sectors"}
            </Link>
          );
        })}
      </nav>

      <p aria-live="polite" className="text-sm text-ink-2">
        Showing {plural(rows.length, "company", "companies")}
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-line py-8">
          <p className="text-ink-2">No companies match these filters.</p>
          <Link href="/companies" className="btn-secondary">
            Clear filters
          </Link>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-charcoal text-left">
              <th scope="col" className="lbl py-3 pr-3">
                Company
              </th>
              <th scope="col" className="lbl hidden p-3 md:table-cell">
                Sector
              </th>
              <th scope="col" className="lbl hidden p-3 md:table-cell">
                Last drive
              </th>
              <th
                scope="col"
                className="lbl hidden p-3 text-right md:table-cell"
              >
                Drives
              </th>
              <th scope="col" className="lbl p-3 text-right">
                Questions
              </th>
              <th scope="col" className="py-3 pl-3">
                <span className="sr-only">Follow</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-b border-line hover:bg-[#FAFAFA]"
              >
                <td className="py-3.5 pr-3">
                  <Link
                    href={`/companies/${c.slug}`}
                    className="text-[17px] font-bold text-charcoal no-underline hover:text-crimson"
                  >
                    {c.name}
                  </Link>
                  <span className="mt-0.5 block text-sm text-ink-3 md:hidden">
                    {[c.sector, monthYear(c.lastDrive)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </td>
                <td className="hidden p-3.5 text-ink-2 md:table-cell">
                  {c.sector ?? "–"}
                </td>
                <td className="hidden p-3.5 text-ink-2 md:table-cell">
                  {monthYear(c.lastDrive)}
                </td>
                <td className="hidden p-3.5 text-right md:table-cell">
                  {c.drives}
                </td>
                <td className="p-3.5 text-right font-bold">{c.questions}</td>
                <td className="py-2 pl-3 text-right">
                  <FollowButton
                    companyId={c.id}
                    companyName={c.name}
                    initial={followed.has(c.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
