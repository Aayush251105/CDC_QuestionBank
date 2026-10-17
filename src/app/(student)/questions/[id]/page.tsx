import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Markdown } from "@/components/Markdown";
import { SaveQuestionButton } from "@/components/SaveQuestionButton";
import { SkeletonRows } from "@/components/Skeleton";
import { driveSegment } from "@/lib/drives";
import { difficultyLabel, questionTypeLabel } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getQuestionDetail } from "@/server/queries/question";

export const metadata: Metadata = {
  title: "Question · Placement Question Bank",
};

type RoundRef = {
  slug: string;
  name: string;
  drive: {
    year: number;
    sequence: number;
    company: { name: string; slug: string };
  };
};
const roundHref = (r: RoundRef) =>
  `/companies/${r.drive.company.slug}/${driveSegment(r.drive.year, r.drive.sequence)}/${r.slug}`;

// Page 06. The full question, where it was asked and similar questions.
export default function QuestionPage(props: PageProps<"/questions/[id]">) {
  return (
    <Suspense fallback={<QuestionSkeleton />}>
      <Question {...props} />
    </Suspense>
  );
}

async function Question({ params }: PageProps<"/questions/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const q = await getQuestionDetail(id);
  if (!q) notFound();

  const saved = Boolean(
    await db.bookmark.findUnique({
      where: { userId_questionId: { userId: user.id, questionId: q.id } },
      select: { id: true },
    }),
  );
  const { round } = q;
  const company = round.drive.company;

  return (
    <div className="wrap flex flex-col gap-7 pt-7 pb-16">
      <Breadcrumbs
        items={[
          { label: "Companies", href: "/companies" },
          { label: company.name, href: `/companies/${company.slug}` },
          {
            label: `${round.drive.year} ${round.name.toLowerCase()}`,
            href: roundHref(round),
          },
          { label: `Question ${q.number}` },
        ]}
      />

      <div className="flex flex-wrap gap-14">
        <article className="relative flex min-w-0 flex-[999_1_600px] flex-col gap-6">
          <div className="flex flex-col gap-3 border-b-2 border-charcoal pb-6">
            <p className="eyebrow">
              {questionTypeLabel[q.type]} · {difficultyLabel[q.difficulty]}
            </p>
            <h1 className="text-[30px] leading-[1.15] font-bold sm:text-[38px]">
              {q.title}
            </h1>
            {q.tags.length > 0 && (
              <p className="text-[15px] text-ink-2">
                Topics:{" "}
                {q.tags.map((t, i) => (
                  <span key={t.slug}>
                    {i > 0 && ", "}
                    <Link href={`/search?topic=${t.slug}`}>{t.name}</Link>
                  </span>
                ))}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-2.5">
              <SaveQuestionButton questionId={q.id} initial={saved} />
              <CopyLinkButton />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Markdown source={q.bodyMarkdown} size="lg" />
            {q.options.length > 0 && (
              <ol className="flex flex-col gap-1.5 text-[17px] leading-[1.75]">
                {q.options.map((o) => (
                  <li key={o.key}>
                    <span className="font-bold">{o.key}.</span> {o.text}
                  </li>
                ))}
              </ol>
            )}
            {q.notes && (
              <div className="bg-peach px-5 py-4 text-[15px] leading-relaxed">
                <strong>From the students who sat it:</strong> {q.notes}
              </div>
            )}
          </div>

          <nav
            aria-label="Questions in this round"
            className="flex flex-wrap justify-between gap-4 border-t border-line pt-5"
          >
            <Link
              href={roundHref(round)}
              className="flex min-h-11 flex-col text-charcoal no-underline"
            >
              <span className="lbl">Back to</span>
              <strong className="text-crimson">
                {q.roundCount > 1
                  ? `All ${q.roundCount} questions in this round`
                  : "This round"}
              </strong>
            </Link>
            {(q.next ?? q.previous) && (
              <Link
                href={`/questions/${(q.next ?? q.previous)!.id}`}
                className="flex min-h-11 flex-col text-right text-charcoal no-underline"
              >
                <span className="lbl">
                  {q.next ? "Next question" : "Previous question"}
                </span>
                <strong className="text-crimson">
                  {(q.next ?? q.previous)!.title}
                </strong>
              </Link>
            )}
          </nav>

          {/* Faint mark with the viewer's own address, to discourage sharing
              screenshots outside SNU. Never the submitter. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-0 -rotate-12 text-xs text-charcoal opacity-10 select-none"
          >
            {user.email}
          </span>
        </article>

        <aside className="flex flex-[1_1_300px] flex-col gap-9">
          <section className="flex flex-col">
            <h2 className="mb-1 text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
              Where it was asked
            </h2>
            <ul className="border-t-2 border-charcoal">
              {q.askedIn.map((r) => (
                <li key={roundHref(r)} className="border-b border-line">
                  <Link
                    href={roundHref(r)}
                    className="flex min-h-13 flex-col justify-center py-2.5 text-charcoal no-underline hover:text-crimson"
                  >
                    <strong>{r.drive.company.name}</strong>
                    <span className="text-sm text-ink-3">
                      {r.drive.year} · {r.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {q.similar.length > 0 && (
            <section className="flex flex-col">
              <h2 className="mb-1 text-[13px] font-bold tracking-[0.14em] text-crimson uppercase">
                Similar questions
              </h2>
              <ul className="border-t-2 border-charcoal">
                {q.similar.map((s) => (
                  <li key={s.id} className="border-b border-line">
                    <Link
                      href={`/questions/${s.id}`}
                      className="flex min-h-13 flex-col gap-0.5 py-2.5 text-charcoal no-underline hover:text-crimson"
                    >
                      <strong>{s.title}</strong>
                      <span className="text-sm text-ink-3">
                        {s.round.drive.company.name} {s.round.drive.year} ·{" "}
                        {difficultyLabel[s.difficulty]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-[13px] leading-relaxed text-ink-3">
            {q.creditedNames.length > 0 && (
              <>Shared with credit to {q.creditedNames.join(", ")}. </>
            )}
            Shared by students and checked by the CDC. Submitters stay anonymous
            unless they choose credit. Please keep these questions within SNU.
          </p>
        </aside>
      </div>
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div className="wrap flex flex-col gap-6 py-7">
      <span className="h-4 w-80 bg-grey-band" />
      <span className="h-10 w-2/3 bg-grey-band" />
      <SkeletonRows rows={4} />
    </div>
  );
}
