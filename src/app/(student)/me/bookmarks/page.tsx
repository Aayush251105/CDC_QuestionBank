import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowButton } from "@/components/FollowButton";
import { SkeletonRows } from "@/components/Skeleton";
import { difficultyLabel, plural, questionTypeLabel } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import { getBookmarks } from "@/server/queries/me";
import { SavedQuestion } from "./SavedQuestion";

export const metadata: Metadata = {
  title: "Bookmarks · Placement Question Bank",
};

type Props = PageProps<"/me/bookmarks">;

// Page 11. The tab lives in the URL (?tab=companies).
export default function BookmarksPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<BookmarksSkeleton />}>
      <Bookmarks searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookmarks({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const showCompanies = tab === "companies";
  const { questions, companies } = await getBookmarks(user.id);

  const tabs = [
    {
      key: "questions",
      label: "Questions",
      count: questions.length,
      href: "/me/bookmarks",
    },
    {
      key: "companies",
      label: "Companies",
      count: companies.length,
      href: "/me/bookmarks?tab=companies",
    },
  ];

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9">
          <p className="eyebrow">Your account</p>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
            Bookmarks
          </h1>
          <p className="text-ink-2">
            Companies you follow and questions you saved to practise later.
          </p>
          <nav aria-label="Bookmark type" className="mt-4.5 flex">
            {tabs.map((t) => {
              const active = (t.key === "companies") === showCompanies;
              return (
                <Link
                  key={t.key}
                  href={t.href}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`mr-6 flex min-h-11.5 items-center border-b-2 px-0.5 text-[15px] font-bold no-underline ${
                    active
                      ? "border-crimson text-crimson"
                      : "border-transparent text-ink-2 hover:text-charcoal"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 font-medium text-ink-3">
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="wrap pt-7 pb-18">
        {!showCompanies &&
          (questions.length === 0 ? (
            <Empty>
              No saved questions yet. Use <strong>Save question</strong> on any
              question to keep it here.{" "}
              <Link href="/search" className="font-bold">
                Find questions
              </Link>
            </Empty>
          ) : (
            <ul className="border-t-2 border-charcoal">
              {questions.map((q) => (
                <SavedQuestion
                  key={q.id}
                  id={q.id}
                  title={q.title}
                  meta={[
                    q.round.drive.company.name,
                    `${q.round.drive.year} ${q.round.type === "OA" ? "OA" : q.round.name}`,
                    `${questionTypeLabel[q.type]} · ${difficultyLabel[q.difficulty]}`,
                  ].join(" · ")}
                />
              ))}
            </ul>
          ))}

        {showCompanies &&
          (companies.length === 0 ? (
            <Empty>
              You do not follow any companies yet.{" "}
              <Link href="/companies" className="font-bold">
                Browse companies
              </Link>
            </Empty>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] border-t-2 border-charcoal">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 border-b border-line py-5.5 pr-5"
                >
                  <Link
                    href={`/companies/${c.slug}`}
                    className="text-[19px] font-bold text-charcoal no-underline hover:text-crimson"
                  >
                    {c.name}
                  </Link>
                  <span className="text-sm text-ink-3">
                    {[c.sector, plural(c.questions, "question")]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {c.newThisWeek > 0 && (
                    <span className="text-sm font-bold text-crimson">
                      {c.newThisWeek} new this week
                    </span>
                  )}
                  <div className="self-start">
                    <FollowButton
                      companyId={c.id}
                      companyName={c.name}
                      initial
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t-2 border-charcoal py-8 text-ink-2">{children}</p>
  );
}

function BookmarksSkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-3 py-9">
          <span className="h-4 w-32 bg-line" />
          <span className="h-10 w-56 bg-line" />
        </div>
      </section>
      <div className="wrap py-7">
        <SkeletonRows rows={5} />
      </div>
    </>
  );
}
