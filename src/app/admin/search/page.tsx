import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead } from "@/components/admin/ui";
import { driveTitle } from "@/lib/admin";
import { requireAdmin } from "@/server/admin/guard";
import { driveTitleSelect } from "@/server/admin/queries";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Search · Admin · Placement Question Bank",
};

// Header search (A00a "Global search"): drives, students (by roll number,
// email or name) and questions.
export default function AdminSearchPage({
  searchParams,
}: PageProps<"/admin/search">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHead eyebrow="Search" title="Search" />
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        </>
      }
    >
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

const LIMIT = 10;

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/admin/search">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const contains = { contains: q, mode: "insensitive" as const };
  const year = /^\d{4}$/.test(q) ? Number(q) : null;

  const [drives, students, questions] = q
    ? await Promise.all([
        db.drive.findMany({
          where: {
            verified: true,
            OR: [
              { company: { name: contains } },
              { company: { aliases: { has: q } } },
              { roles: { has: q } },
              ...(year ? [{ year }] : []),
            ],
          },
          orderBy: [{ year: "desc" }, { company: { name: "asc" } }],
          take: LIMIT,
          select: { ...driveTitleSelect, status: true },
        }),
        db.user.findMany({
          where: {
            role: "STUDENT",
            OR: [{ name: contains }, { email: contains }, { rollNo: contains }],
          },
          orderBy: { name: "asc" },
          take: LIMIT,
          select: { id: true, name: true, email: true, rollNo: true },
        }),
        db.question.findMany({
          where: { OR: [{ title: contains }, { bodyMarkdown: contains }] },
          orderBy: { publishedAt: "desc" },
          take: LIMIT,
          select: {
            id: true,
            title: true,
            unpublishedAt: true,
            round: {
              select: {
                name: true,
                drive: {
                  select: { year: true, company: { select: { name: true } } },
                },
              },
            },
          },
        }),
      ])
    : [[], [], []];

  const none = q && drives.length + students.length + questions.length === 0;
  const section = "flex flex-col";
  const h2 = "mb-1 border-b-2 border-charcoal pb-2 text-lg font-bold";
  const item = "flex flex-col border-b border-line py-3";

  return (
    <>
      <PageHead
        eyebrow="Search"
        title={q ? `Results for "${q}"` : "Search"}
        intro={
          q
            ? undefined
            : "Type in the search box above: a company, a roll number or email, or words from a question."
        }
      />
      <div className="flex flex-col gap-8 px-5 pt-6 pb-12 sm:px-8">
        {none && (
          <p className="text-ink-3">Nothing matches &ldquo;{q}&rdquo;.</p>
        )}
        {drives.length > 0 && (
          <section className={section} aria-labelledby="sd">
            <h2 id="sd" className={h2}>
              Drives
            </h2>
            {drives.map((d) => (
              <Link
                key={d.id}
                href={`/admin/drives/${d.id}`}
                className={`${item} font-bold text-charcoal no-underline hover:text-crimson`}
              >
                {driveTitle(d)}
              </Link>
            ))}
          </section>
        )}
        {students.length > 0 && (
          <section className={section} aria-labelledby="ss">
            <h2 id="ss" className={h2}>
              Students
            </h2>
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/admin/students?id=${s.id}`}
                className={`${item} text-charcoal no-underline hover:text-crimson`}
              >
                <strong>{s.name}</strong>
                <span className="text-[13px] text-ink-3">
                  {[s.rollNo, s.email].filter(Boolean).join(" · ")}
                </span>
              </Link>
            ))}
          </section>
        )}
        {questions.length > 0 && (
          <section className={section} aria-labelledby="sq">
            <h2 id="sq" className={h2}>
              Questions
            </h2>
            {questions.map((x) => (
              <Link
                key={x.id}
                href={`/admin/questions?edit=${x.id}${x.unpublishedAt ? "&show=unpublished" : ""}#edit`}
                className={`${item} text-charcoal no-underline hover:text-crimson`}
              >
                <strong>{x.title}</strong>
                <span className="text-[13px] text-ink-3">
                  {x.round.drive.company.name} {x.round.drive.year} ·{" "}
                  {x.round.name}
                  {x.unpublishedAt && " · unpublished"}
                </span>
              </Link>
            ))}
          </section>
        )}
        {(drives.length === LIMIT ||
          students.length === LIMIT ||
          questions.length === LIMIT) && (
          <p className="text-sm text-ink-3">
            Showing the first {LIMIT} of each. Narrow the search, or use the
            filters on Drives, Students and Questions.
          </p>
        )}
      </div>
    </>
  );
}
