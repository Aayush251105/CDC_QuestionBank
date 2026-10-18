import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Markdown } from "@/components/Markdown";
import { QuestionAccordion } from "@/components/QuestionAccordion";
import { SaveQuestionButton } from "@/components/SaveQuestionButton";
import { SkeletonRows } from "@/components/Skeleton";
import type { QuestionType } from "@/generated/prisma/enums";
import { driveLabel, driveSegment, roundRoles } from "@/lib/drives";
import {
  difficultyLabel,
  fullDate,
  plural,
  questionTypeLabel,
} from "@/lib/labels";
import { slugify } from "@/lib/slug";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getRoundDetail } from "@/server/queries/round";

export const metadata: Metadata = {
  title: "Round · Placement Question Bank",
};

type Props = PageProps<"/companies/[slug]/[year]/[round]">;

// Page 05. Round format, then numbered questions that expand in place.
// The type tab lives in the URL (?type=coding); ?role= is passed through so
// the breadcrumb returns to the role the student was looking at.
export default function RoundPage(props: Props) {
  return (
    <Suspense fallback={<RoundSkeleton />}>
      <Round {...props} />
    </Suspense>
  );
}

async function Round({ params, searchParams }: Props) {
  const user = await requireUser();
  const { slug, year: segment, round: roundSlug } = await params;
  const round = await getRoundDetail(slug, segment, roundSlug);
  if (!round) notFound();

  const query = await searchParams;
  const { drive } = round;
  const company = drive.company;
  const roles = roundRoles(round.roles, drive.roles);
  const roleParam =
    typeof query.role === "string" &&
    drive.roles.some((r) => slugify(r) === query.role)
      ? query.role
      : undefined;

  // Type tabs: only the types this round has.
  const types = [...new Set(round.questions.map((q) => q.type))];
  const typeParam = typeof query.type === "string" ? query.type : undefined;
  const type = types.find((t) => t.toLowerCase() === typeParam);
  const questions = type
    ? round.questions.filter((q) => q.type === type)
    : round.questions;

  const saved = new Set(
    (
      await db.bookmark.findMany({
        where: {
          userId: user.id,
          questionId: { in: round.questions.map((q) => q.id) },
        },
        select: { questionId: true },
      })
    ).map((b) => b.questionId),
  );

  const companyHref = `/companies/${company.slug}?${new URLSearchParams({
    year: String(drive.year),
    ...(roleParam ? { role: roleParam } : {}),
  })}`;
  const tabHref = (t?: QuestionType) => {
    const p = new URLSearchParams();
    if (t) p.set("type", t.toLowerCase());
    if (roleParam) p.set("role", roleParam);
    const qs = p.toString();
    return `/companies/${company.slug}/${segment}/${roundSlug}${qs ? `?${qs}` : ""}`;
  };
  const visit = driveLabel(drive.year, drive.sequence, round.visitsThatYear);

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-4 pt-7 pb-9">
          <Breadcrumbs
            items={[
              { label: "Companies", href: "/companies" },
              { label: company.name, href: `/companies/${company.slug}` },
              { label: visit, href: companyHref },
              { label: round.name },
            ]}
          />
          <p className="eyebrow">
            {[company.name, roles.join(", "), visit]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="text-[34px] leading-[1.1] font-bold sm:text-[42px]">
            {round.name}
          </h1>
          <dl className="mt-2 grid grid-cols-2 border-t border-disabled sm:grid-cols-4">
            {[
              ["Date", fullDate(round.date)],
              ["Platform", round.platform ?? "Not shared yet"],
              [
                "Duration",
                round.durationMin
                  ? `${round.durationMin} minutes`
                  : "Not shared yet",
              ],
              ["Shared by", plural(round.sharedBy, "student")],
            ].map(([label, value]) => (
              <div key={label} className="pt-3.5 pr-4">
                <dt className="lbl">{label}</dt>
                <dd className="text-lg font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {round.format && (
            <p className="text-ink-2">
              <span className="font-bold text-charcoal">Format:</span>{" "}
              {round.format}
            </p>
          )}
        </div>
      </section>

      <div className="wrap flex max-w-245 flex-col gap-2 pt-8 pb-16">
        {round.questions.length === 0 ? (
          <p className="py-6 text-ink-2">
            No questions have been published for this round yet.
          </p>
        ) : (
          <>
            {types.length > 1 && (
              <nav
                aria-label="Question type"
                className="flex flex-wrap border-b border-line"
              >
                {[undefined, ...types].map((t) => {
                  const active = t === type;
                  return (
                    <Link
                      key={t ?? "all"}
                      href={tabHref(t)}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={`mr-6 flex min-h-11.5 items-center border-b-2 px-0.5 text-[15px] font-bold no-underline ${
                        active
                          ? "border-crimson text-crimson"
                          : "border-transparent text-ink-2 hover:text-charcoal"
                      }`}
                    >
                      {t ? questionTypeLabel[t] : "All questions"}
                    </Link>
                  );
                })}
              </nav>
            )}
            <QuestionAccordion
              key={type ?? "all"}
              items={questions.map((q, i) => ({
                id: q.id,
                number: String(i + 1).padStart(2, "0"),
                title: q.title,
                meta: [
                  questionTypeLabel[q.type],
                  difficultyLabel[q.difficulty],
                  q.tags.map((t) => t.name).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · "),
                content: (
                  <div className="flex flex-col gap-3.5">
                    <Markdown source={q.bodyMarkdown} />
                    {q.options.length > 0 && (
                      <ol className="flex flex-col gap-1 leading-[1.7]">
                        {q.options.map((o) => (
                          <li key={o.key}>
                            <span className="font-bold">{o.key}.</span> {o.text}
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm">
                      {q.alsoAsked.length > 0 && (
                        <span className="text-ink-2">
                          Also asked at{" "}
                          {q.alsoAsked.map((r, j) => (
                            <span key={j}>
                              {j > 0 && ", "}
                              <Link
                                href={`/companies/${r.drive.company.slug}/${driveSegment(r.drive.year, r.drive.sequence)}/${r.slug}`}
                                className="font-bold"
                              >
                                {r.drive.company.name} {r.drive.year}
                              </Link>
                            </span>
                          ))}
                        </span>
                      )}
                      <Link href={`/questions/${q.id}`} className="font-bold">
                        Open full page
                      </Link>
                      <SaveQuestionButton
                        questionId={q.id}
                        initial={saved.has(q.id)}
                      />
                    </div>
                  </div>
                ),
              }))}
            />
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-peach px-7 py-6">
          <span className="flex flex-col">
            <strong className="text-lg">
              Remember a question that is missing?
            </strong>
            <span className="text-[15px]">
              Add it to this round. It goes to the CDC for checking first.
            </span>
          </span>
          <Link href="/submit" className="btn-primary">
            Add a question
          </Link>
        </div>
      </div>
    </>
  );
}

function RoundSkeleton() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-4 py-9">
          <span className="h-4 w-72 bg-line" />
          <span className="h-11 w-80 bg-line" />
          <span className="h-12 w-full bg-line" />
        </div>
      </section>
      <div className="wrap max-w-245 py-8">
        <SkeletonRows rows={4} />
      </div>
    </>
  );
}
