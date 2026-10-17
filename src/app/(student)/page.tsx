import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { MoreLink } from "@/components/MoreLink";
import { QuestionRow } from "@/components/QuestionRow";
import { SkeletonRows } from "@/components/Skeleton";
import { greeting, plural } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import {
  getFollowedCompanies,
  getOpenDrives,
  getRecentQuestions,
  getTopTopics,
} from "@/server/queries/home";

// Page 02. Everything renders after requireUser(), so no question data ever
// lands in the prerendered shell that signed-out visitors receive.
export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

const examples = [
  { label: "Amazon 2025", q: "Amazon 2025" },
  { label: "sliding window", q: "sliding window" },
  { label: "SQL joins", q: "SQL joins" },
  { label: "quant aptitude", q: "quant aptitude" },
];

async function Home() {
  const user = await requireUser();
  const [recent, topics, openDrives, followed] = await Promise.all([
    getRecentQuestions(),
    getTopTopics(),
    getOpenDrives(),
    getFollowedCompanies(user.id),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-wrap items-stretch gap-12 py-14">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col justify-center gap-5">
            <p className="eyebrow">
              {greeting()}, {firstName}
            </p>
            <h1 className="max-w-160 text-[34px] leading-[1.1] font-bold tracking-[-0.01em] sm:text-[46px]">
              Find the questions companies asked at SNU.
            </h1>
            <Form
              action="/search"
              role="search"
              className="flex max-w-160 flex-wrap"
            >
              <label htmlFor="hero-q" className="sr-only">
                Search questions, companies and topics
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                className="field w-auto flex-[1_1_300px]"
                placeholder="Company, topic or a few words of the question"
              />
              <button type="submit" className="btn-primary min-h-13 px-7">
                Search
              </button>
            </Form>
            <p className="text-[15px] text-ink-2">
              Try{" "}
              {examples.map((e, i) => (
                <span key={e.q}>
                  <Link href={`/search?q=${encodeURIComponent(e.q)}`}>
                    {e.label}
                  </Link>
                  {i < examples.length - 2
                    ? ", "
                    : i === examples.length - 2
                      ? " or "
                      : "."}
                </span>
              ))}
            </p>
          </div>

          <aside
            aria-labelledby="open-h"
            className="flex flex-[1_1_340px] flex-col gap-4.5 bg-crimson p-8 text-white"
          >
            <h2
              id="open-h"
              className="text-[13px] font-bold tracking-[0.14em] uppercase"
            >
              Open drives
            </h2>
            {openDrives.length === 0 ? (
              <p className="border-t border-white/35 pt-3 text-[15px]">
                No drives are open for submissions right now.
              </p>
            ) : (
              <ul className="flex flex-col">
                {openDrives.map((d) => (
                  <li key={d.id} className="border-t border-white/35">
                    <Link
                      href={`/companies/${d.company.slug}?year=${d.year}`}
                      className="flex justify-between gap-3 py-3 text-white no-underline hover:text-white hover:underline"
                    >
                      <span className="flex flex-col leading-tight">
                        <strong className="text-[17px]">
                          {d.company.name}
                        </strong>
                        <span className="text-sm opacity-90">
                          {d.name} · {d.year}
                        </span>
                      </span>
                      <span className="self-center text-right text-sm leading-tight">
                        {d.questions > 0
                          ? plural(d.questions, "question")
                          : "No questions yet"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/companies"
              className="text-[15px] font-bold text-white hover:text-white"
            >
              All companies
            </Link>
          </aside>
        </div>
      </section>

      <div className="wrap flex flex-wrap gap-14 pt-14 pb-16">
        <section
          aria-labelledby="recent-h"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-2"
        >
          <p className="eyebrow">Just published</p>
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-charcoal pb-3">
            <h2 id="recent-h" className="text-[30px] font-bold">
              Recently added questions
            </h2>
            <MoreLink href="/search">View all</MoreLink>
          </div>
          {recent.length === 0 ? (
            <p className="py-4 text-ink-2">
              No questions have been published yet.
            </p>
          ) : (
            <div>
              {recent.map((q) => (
                <QuestionRow
                  key={q.id}
                  id={q.id}
                  title={q.title}
                  type={q.type}
                  difficulty={q.difficulty}
                  where={`${q.round.drive.company.name} · ${q.round.drive.year} · ${q.round.name}`}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-[1_1_300px] flex-col gap-10">
          <section aria-labelledby="mine-h" className="flex flex-col gap-2">
            <p className="eyebrow">Following</p>
            <h2
              id="mine-h"
              className="border-b-2 border-charcoal pb-3 text-[22px] font-bold"
            >
              Your companies
            </h2>
            {followed.length === 0 ? (
              <p className="py-3 text-[15px] text-ink-2">
                Follow a company to see its new questions here.{" "}
                <Link href="/companies" className="font-bold">
                  Browse companies
                </Link>
              </p>
            ) : (
              <ul>
                {followed.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/companies/${c.slug}`}
                      className="flex min-h-13 items-center justify-between border-b border-line text-charcoal no-underline hover:text-crimson"
                    >
                      <strong>{c.name}</strong>
                      {c.fresh > 0 && (
                        <span className="text-sm font-bold text-crimson">
                          {c.fresh} new
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <MoreLink href="/me/bookmarks" className="mt-1.5">
              Manage bookmarks
            </MoreLink>
          </section>

          <section
            aria-labelledby="share-h"
            className="flex flex-col gap-3 bg-peach p-7"
          >
            <p className="eyebrow text-charcoal">Give back</p>
            <h2 id="share-h" className="text-[22px] leading-tight font-bold">
              Sat an OA this week?
            </h2>
            <p className="text-[15px]">
              Share the questions while they are fresh. Type them in or upload
              photos of your rough sheet. It takes about five minutes and you
              stay anonymous.
            </p>
            <Link href="/submit" className="btn-primary self-start">
              Submit an OA
            </Link>
          </section>
        </aside>
      </div>

      <section className="border-t border-line bg-grey-band">
        <div className="wrap flex flex-col gap-5 pt-12 pb-14">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="eyebrow">Explore</p>
              <h2 className="text-[30px] font-bold">Practise by topic</h2>
            </div>
            <MoreLink href="/topics">All topics</MoreLink>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] border-t border-l border-line sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/search?topic=${t.slug}`}
                className="flex flex-col gap-0.5 border-r border-b border-line bg-white p-4.5 text-charcoal no-underline hover:text-crimson"
              >
                <strong>{t.name}</strong>
                <span className="text-sm text-ink-3">
                  {plural(t.count, "question")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-5 py-14">
          <span className="h-4 w-48 bg-line" />
          <span className="h-12 w-full max-w-160 bg-line" />
          <span className="h-13 w-full max-w-160 bg-white" />
        </div>
      </section>
      <div className="wrap py-14">
        <SkeletonRows rows={6} />
      </div>
    </>
  );
}
