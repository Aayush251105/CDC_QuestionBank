import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FollowButton } from "@/components/FollowButton";
import { SkeletonRows } from "@/components/Skeleton";
import {
  driveIsFor,
  driveLabel,
  driveSegment,
  pickRole,
  rolesOf,
  roundIsFor,
} from "@/lib/drives";
import { fullDate, plural } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getCompanyDetail } from "@/server/queries/company";

export const metadata: Metadata = {
  title: "Company · Placement Question Bank",
};

// Page 04. Year and role live in the URL (?year=2025&role=sde-i) so Back and
// shared links keep them. A company can hire for several roles in one drive,
// each with its own rounds, so the page shows one role at a time.
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
  const drivesThisYear = company.drives.filter((d) => d.year === year);

  const roles = rolesOf(drivesThisYear);
  const role = pickRole(
    roles,
    typeof query.role === "string" ? query.role : undefined,
    slugify,
  );
  // Only the drives and rounds for the chosen role.
  const drives = drivesThisYear
    .filter((d) => driveIsFor(d, role))
    .map((d) => ({
      ...d,
      rounds: d.rounds.filter((r) => roundIsFor(r, role)),
    }));

  const following = Boolean(
    await db.bookmark.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      select: { id: true },
    }),
  );
  const unique = (values: (string | null)[]) => [
    ...new Set(values.filter((v): v is string => Boolean(v))),
  ];
  const ctc = unique(drives.map((d) => d.ctcBand));
  const eligibility = unique(drives.map((d) => d.eligibility));
  const topics = mostAsked(
    drives.flatMap((d) => d.rounds.flatMap((r) => r.topics)),
  );

  const href = (y: number, r: string | null) => {
    const p = new URLSearchParams({ year: String(y) });
    if (r) p.set("role", slugify(r));
    return `/companies/${company.slug}?${p}`;
  };

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
                href={href(y, role)}
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

      <div className="wrap flex flex-wrap gap-14 pt-9 pb-16">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-10">
          {roles.length > 1 && (
            <div className="flex flex-col gap-2.5">
              <span id="role-label" className="lbl">
                {roles.length} roles in {year} · showing rounds for
              </span>
              <nav
                aria-labelledby="role-label"
                className="flex flex-wrap gap-2"
              >
                {roles.map((r) => (
                  <Link
                    key={r}
                    href={href(year, r)}
                    scroll={false}
                    aria-current={r === role ? "page" : undefined}
                    className={`flex min-h-11 items-center border px-4 text-[15px] font-bold no-underline ${
                      r === role
                        ? "border-charcoal bg-charcoal text-white hover:text-white"
                        : "border-line-strong bg-white text-charcoal hover:border-charcoal hover:text-charcoal"
                    }`}
                  >
                    {r}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {drives.map((drive) => (
            <section
              key={drive.id}
              aria-labelledby={`d-${drive.id}`}
              className="flex flex-col"
            >
              <h2 id={`d-${drive.id}`} className="mb-2 text-[26px] font-bold">
                {driveLabel(year, drive.sequence, drivesThisYear.length)} drive
                · {roles.length > 1 && role ? `${role} rounds` : "rounds"}
              </h2>
              {drive.name && (
                <p className="-mt-1 mb-2 text-ink-2">{drive.name}</p>
              )}
              {drive.rounds.length === 0 && (
                <p className="border-t border-line py-7 text-ink-2">
                  The CDC has not added the rounds for this drive yet.
                </p>
              )}
              {drive.rounds.map((r, i) => (
                <article
                  key={r.id}
                  className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-line py-7 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-x-5"
                >
                  <span className="text-[32px] leading-none font-bold text-crimson sm:text-[40px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[22px] font-bold">{r.name}</h3>
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
              <dt className="lbl">{roles.length > 1 ? "Role" : "Roles"}</dt>
              <dd className="font-medium">
                {roles.length > 1 ? role : roles.join(", ") || "Not shared yet"}
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

// The 4 topics that come up most often in these rounds' questions.
function mostAsked(topics: { name: string; slug: string }[]) {
  const counts = new Map<string, { name: string; slug: string; n: number }>();
  for (const t of topics) {
    const entry = counts.get(t.slug) ?? { ...t, n: 0 };
    entry.n += 1;
    counts.set(t.slug, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 4);
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
