import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import type { QuestionType } from "@/generated/prisma/enums";
import {
  difficultyLabel,
  plural,
  questionTypeLabel,
  roundTypeLabel,
} from "@/lib/labels";
import {
  PAGE_SIZE,
  parseHeadline,
  parseSearchFilters,
  ROUND_TYPES as SEARCH_ROUND_TYPES,
  searchHref,
  type SearchFilters,
} from "@/lib/search";
import { requireUser } from "@/server/auth";
import { getSearchOptions, searchQuestions } from "@/server/queries/search";
import { AutoSubmitForm } from "./AutoSubmitForm";

export const metadata: Metadata = {
  title: "Search · Placement Question Bank",
};

const TYPE_ORDER: QuestionType[] = [
  "CODING",
  "MCQ",
  "SQL",
  "APTITUDE",
  "WRITTEN",
  "OTHER",
];

// Page 07. Every filter lives in the URL so Back restores it and a search
// can be shared.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

async function Search({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  await requireUser();
  const f = parseSearchFilters(await searchParams);
  const [found, options] = await Promise.all([
    searchQuestions(f),
    getSearchOptions(),
  ]);
  const topicName = options.topics.find((t) => t.slug === f.topic)?.name;
  const companyName = options.companies.find(
    (c) => c.slug === (f.company ?? found.understood.company),
  )?.name;

  const summary = [
    plural(found.total, "question"),
    f.q && `for “${f.q}”`,
    topicName && `on ${topicName}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-3.5 pt-10 pb-9">
          <p className="eyebrow">Search the question bank</p>
          <Form
            action="/search"
            role="search"
            className="flex max-w-205 flex-wrap"
          >
            <label htmlFor="q" className="sr-only">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={f.q}
              placeholder="Company, topic or a few words of the question"
              className="field min-h-14 w-auto flex-[1_1_320px] text-xl"
            />
            <button type="submit" className="btn-primary min-h-14 px-7.5">
              Search
            </button>
          </Form>
          <p aria-live="polite" className="text-ink-2">
            {summary}
            {!f.company && companyName && found.understood.company
              ? ` · showing ${companyName}${found.understood.year && !f.year ? ` ${found.understood.year}` : ""}`
              : ""}
            {found.understood.anyWord
              ? " · no exact matches, showing questions with any of these words"
              : ""}
            {found.understood.types.length > 0
              ? ` · ${found.understood.types.map((t) => questionTypeLabel[t]).join(", ")} only`
              : ""}
          </p>
        </div>
      </section>

      <div className="wrap flex flex-wrap gap-12 pt-9 pb-16">
        {/* On phones the results come first; the filters follow below. */}
        <aside
          id="filters-panel"
          aria-label="Filters"
          className="order-2 flex flex-[1_1_240px] scroll-mt-4 flex-col gap-6.5 lg:order-1"
        >
          <div className="flex items-center justify-between border-b-2 border-charcoal pb-2.5">
            <h2 className="text-lg font-bold">Filter results</h2>
            <Link
              href={searchHref({ q: f.q })}
              scroll={false}
              className="flex min-h-9 items-center text-sm font-bold no-underline hover:underline"
            >
              Clear all
            </Link>
          </div>
          <AutoSubmitForm
            key={searchHref(f)}
            id="filters"
            className="flex flex-col gap-6.5"
          >
            <input type="hidden" name="q" value={f.q} />
            <fieldset>
              <legend className="lbl mb-2">Question type</legend>
              {TYPE_ORDER.map((t) => (
                <label
                  key={t}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]"
                >
                  <input
                    type="checkbox"
                    name="type"
                    value={t.toLowerCase()}
                    defaultChecked={f.types.includes(t)}
                    className="size-4.5 accent-crimson"
                  />
                  <span className="flex-1">{questionTypeLabel[t]}</span>
                  <span className="text-[13px] text-ink-3">
                    {found.typeCounts[t] ?? 0}
                  </span>
                </label>
              ))}
            </fieldset>
            <FilterSelect
              id="f-topic"
              name="topic"
              label="Topic"
              value={f.topic}
              any="Any topic"
              options={options.topics.map((t) => [t.slug, t.name])}
            />
            <FilterSelect
              id="f-co"
              name="company"
              label="Company"
              value={f.company}
              any="Any company"
              options={options.companies.map((c) => [c.slug, c.name])}
            />
            <FilterSelect
              id="f-yr"
              name="year"
              label="Year"
              value={f.year ? String(f.year) : undefined}
              any="Any year"
              options={options.years.map((y) => [String(y), String(y)])}
            />
            <FilterSelect
              id="f-rd"
              name="round"
              label="Round"
              value={f.round?.toLowerCase()}
              any="Any round"
              options={SEARCH_ROUND_TYPES.map((r) => [
                r.toLowerCase(),
                roundTypeLabel[r],
              ])}
            />
            <fieldset>
              <legend className="lbl mb-2">Difficulty</legend>
              {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                <label
                  key={d}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]"
                >
                  <input
                    type="checkbox"
                    name="difficulty"
                    value={d.toLowerCase()}
                    defaultChecked={f.difficulties.includes(d)}
                    className="size-4.5 accent-crimson"
                  />
                  {difficultyLabel[d]}
                </label>
              ))}
            </fieldset>
            <noscript>
              <button type="submit" className="btn-secondary">
                Apply filters
              </button>
            </noscript>
          </AutoSubmitForm>
        </aside>

        <section
          aria-label="Results"
          className="order-1 flex min-w-0 flex-[999_1_560px] flex-col lg:order-2"
        >
          <div className="flex items-center justify-end gap-2.5 border-b-2 border-charcoal pb-2.5">
            <a
              href="#filters-panel"
              className="mr-auto flex min-h-11 items-center text-[15px] font-bold no-underline hover:underline lg:hidden"
            >
              Filter results
            </a>
            <label htmlFor="sort" className="lbl">
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              form="filters"
              key={searchHref(f)}
              defaultValue={f.sort === "best" ? "" : f.sort}
              className="field min-h-10 w-auto text-[15px]"
            >
              <option value="">Best match</option>
              <option value="newest">Newest</option>
              <option value="most">Most asked</option>
            </select>
          </div>

          {found.results.length === 0 ? (
            <div className="flex flex-col gap-2 py-10">
              <strong className="text-xl">
                No questions match these filters
              </strong>
              <span className="text-ink-2">
                Remove a filter, or{" "}
                <Link href="/topics" className="font-bold">
                  browse by topic
                </Link>
                .
              </span>
            </div>
          ) : (
            <ul>
              {found.results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/questions/${r.id}`}
                    className="group flex flex-col gap-1.5 border-b border-line py-5.5 text-charcoal no-underline hover:text-charcoal"
                  >
                    <span className="text-xs font-bold tracking-[0.08em] text-crimson uppercase">
                      {questionTypeLabel[r.type]} ·{" "}
                      {difficultyLabel[r.difficulty]}
                    </span>
                    <span className="text-[19px] leading-snug font-bold group-hover:text-crimson">
                      {r.title}
                    </span>
                    <Snippet headline={r.headline} body={r.body} />
                    <span className="text-sm text-ink-3">
                      {r.askedIn
                        .map(
                          (a) =>
                            `${a.drive.company.name} ${a.drive.year} ${a.type === "OA" ? "OA" : a.name}`,
                        )
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {found.total > found.results.length && (
            <Link
              href={searchHref({
                ...f,
                page: f.page + 1,
              } satisfies Partial<SearchFilters>)}
              scroll={false}
              className="btn-secondary mt-7 self-center"
            >
              Show more results
            </Link>
          )}
          {found.results.length > PAGE_SIZE && (
            <p className="mt-3 self-center text-sm text-ink-3">
              Showing {found.results.length} of {found.total}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function FilterSelect({
  id,
  name,
  label,
  value,
  any,
  options,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  any: string;
  options: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="lbl">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value ?? ""}
        className="field min-h-12 text-base"
      >
        <option value="">{any}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

// "…use a [sliding window] and a count…" from Postgres, or the start of the
// body when the match was on the topic or there was no search text.
function Snippet({
  headline,
  body,
}: {
  headline: string | null;
  body: string;
}) {
  const parts = headline
    ? parseHeadline(headline)
    : [
        {
          text: parseHeadline(body)
            .map((p) => p.text)
            .join("")
            .slice(0, 160),
          hit: false,
        },
      ];
  return (
    <span className="text-[15px] text-ink-2">
      …
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-peach px-0.5 text-charcoal">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
      …
    </span>
  );
}

function SearchSkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-3.5 py-10">
          <span className="h-4 w-56 bg-line" />
          <span className="h-14 w-full max-w-205 bg-white" />
        </div>
      </section>
      <div className="wrap py-9">
        <SkeletonRows rows={5} />
      </div>
    </>
  );
}
