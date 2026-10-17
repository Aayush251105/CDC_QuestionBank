import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FollowButton } from "@/components/FollowButton";
import { SkeletonRows } from "@/components/Skeleton";
import { driveLabel, driveSegment } from "@/lib/drives";
import { fullDate, plural } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getCompanyDetail } from "@/server/queries/company";

export const metadata: Metadata = {
  title: "Company · Placement Question Bank",
};

// Page 04. The year tab lives in the URL (?year=2025) so Back and shared
// links keep it.
export default function CompanyPage(props: PageProps<"/companies/[slug]">) {
  return (
    <Suspense fallback={<CompanySkeleton />}>
      <Company {...props} />
    </Suspense>
  );
}

async function Company({
  params,
  searchParams,
}: PageProps<"/companies/[slug]">) {
  const user = await requireUser();
  const { slug } = await params;
  const company = await getCompanyDetail(slug);
  if (!company) notFound();

  const query = await searchParams;
  const asked = Number(query.year);
  const year = company.years.includes(asked) ? asked : company.years[0];
  const drives = company.drives.filter((d) => d.year === year);
  const topics = company.topicsByYear.get(year) ?? [];
  const following = Boolean(
    await db.bookmark.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      select: { id: true },
    }),
  );
  const roles = [...new Set(drives.flatMap((d) => d.roles))];
  const ctc = [
    ...new Set(drives.flatMap((d) => (d.ctcBand ? [d.ctcBand] : []))),
  ];
  const eligibility = [
    ...new Set(drives.flatMap((d) => (d.eligibility ? [d.eligibility] : []))),
  ];

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-4.5 pt-7">
          <Breadcrumbs
            items={[
              { label: "Companies", href: "/companies" },
              { label: company.name },
            ]}
          />
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-2">
              {company.sector && <p className="eyebrow">{company.sector}</p>}
              <h1 className="text-[38px] leading-[1.05] font-bold sm:text-5xl">
                {company.name}
              </h1>
              <p className="text-ink-2">
                {plural(company.drives.length, "drive")} ·{" "}
                {plural(company.totalQuestions, "question")} shared
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <FollowButton
                companyId={company.id}
                companyName={company.name}
                initial={following}
                label="Follow company"
              />
              <Link href="/submit" className="btn-primary">
                Share {/^[aeiou]/i.test(company.name) ? "an" : "a"}{" "}
                {company.name} OA
              </Link>
            </div>
          </div>
          <nav aria-label="Drive year" className="mt-2 flex overflow-x-auto">
            {company.years.map((y) => (
              <Link
                key={y}
                href={`/companies/${company.slug}?year=${y}`}
                scroll={false}
                aria-current={y === year ? "page" : undefined}
                className={`mr-7 flex min-h-12.5 items-center border-b-3 px-0.5 font-bold no-underline ${
                  y === year
                    ? "border-crimson text-crimson"
                    : "border-transparent text-ink-2 hover:text-charcoal"
                }`}
              >
                {y}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="wrap flex flex-wrap gap-14 pt-11 pb-16">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-10">
          {drives.map((drive) => (
            <section
              key={drive.id}
              aria-labelledby={`d-${drive.id}`}
              className="flex flex-col"
            >
              <h2 id={`d-${drive.id}`} className="mb-2 text-[26px] font-bold">
                {driveLabel(year, drive.sequence, drives.length)} drive · rounds
              </h2>
              {drive.name && (
                <p className="-mt-1 mb-2 text-ink-2">{drive.name}</p>
              )}
              {drive.rounds.length === 0 && (
                <p className="border-t border-line py-7 text-ink-2">
                  The CDC has not added the rounds for this drive yet.
                </p>
              )}
              {drive.rounds.map((r) => (
                <article
                  key={r.id}
                  className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-line py-7 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-x-5"
                >
                  <span className="text-[32px] leading-none font-bold text-crimson sm:text-[40px]">
                    {String(r.order).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="flex flex-wrap items-baseline gap-x-3 text-[22px] font-bold">
                        {r.name}
                        {drive.roles.length > 1 && r.roles.length > 0 && (
                          <span className="text-xs font-bold tracking-[0.08em] text-ink-2 uppercase">
                            For {r.roles.join(", ")}
                          </span>
                        )}
                      </h3>
                      <span className="text-sm text-ink-3">
                        {fullDate(r.date)}
                      </span>
                    </div>
                    <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                      <div>
                        <dt className="lbl">Format</dt>
                        <dd>{r.format ?? "Not shared yet"}</dd>
                      </div>
                      <div>
                        <dt className="lbl">Platform</dt>
                        <dd>{r.platform ?? "Not shared yet"}</dd>
                      </div>
                      <div>
                        <dt className="lbl">Duration</dt>
                        <dd>
                          {r.durationMin
                            ? `${r.durationMin} min`
                            : "Not shared yet"}
                        </dd>
                      </div>
                    </dl>
                    {r.questions > 0 ? (
                      <Link
                        href={`/companies/${company.slug}/${driveSegment(year, drive.sequence)}/${r.slug}`}
                        className="inline-flex min-h-11 items-center gap-2 self-start font-bold no-underline hover:underline"
                      >
                        Read {plural(r.questions, "question")}
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
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    ) : (
                      <p className="text-[15px] text-ink-2">
                        No questions shared for this round yet.{" "}
                        <Link href="/submit" className="font-bold">
                          Were you in it?
                        </Link>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>

        <aside
          aria-labelledby="glance-h"
          className="flex flex-[1_1_300px] flex-col gap-4 self-start border-t-4 border-charcoal bg-grey-band p-6"
        >
          <h2 id="glance-h" className="text-lg font-bold">
            {year} at a glance
          </h2>
          <dl className="flex flex-col gap-3.5">
            <div>
              <dt className="lbl">Roles</dt>
              <dd className="font-medium">
                {roles.length ? roles.join(", ") : "Not shared yet"}
              </dd>
            </div>
            <div>
              <dt className="lbl">CTC</dt>
              <dd className="font-medium">
                {ctc.length ? ctc.join("; ") : "Not shared by the CDC yet"}
              </dd>
            </div>
            <div>
              <dt className="lbl">Eligibility</dt>
              <dd className="font-medium">
                {eligibility.length
                  ? eligibility.join("; ")
                  : "Not shared by the CDC yet"}
              </dd>
            </div>
            <div>
              <dt className="lbl">Most asked</dt>
              <dd className="mt-1 flex flex-col gap-1">
                {topics.length === 0 ? (
                  <span className="font-medium">No questions yet</span>
                ) : (
                  topics.map((t) => (
                    <Link key={t.slug} href={`/search?topic=${t.slug}`}>
                      {t.name}
                    </Link>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}

function CompanySkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-4 py-7">
          <span className="h-4 w-40 bg-line" />
          <span className="h-12 w-64 bg-line" />
          <span className="h-4 w-56 bg-line" />
        </div>
      </section>
      <div className="wrap py-11">
        <SkeletonRows rows={3} />
      </div>
    </>
  );
}
