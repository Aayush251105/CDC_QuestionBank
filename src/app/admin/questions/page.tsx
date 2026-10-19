import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead, SrOnly, table } from "@/components/admin/ui";
import { difficultyLabel, questionTypeLabel } from "@/lib/labels";
import { requireAdmin } from "@/server/admin/guard";
import {
  getQuestionForEdit,
  getQuestionList,
  PAGE_SIZE,
  parseQuestionFilters,
} from "@/server/admin/questions";
import {
  EditQuestion,
  LiveToggle,
  QuestionFilterBar,
} from "./QuestionControls";

export const metadata: Metadata = {
  title: "Questions · Admin · Placement Question Bank",
};

// A09 Published questions: everything students can see. Edit, re-tag,
// unpublish, and merge across years. Filters live in the URL.
export default function QuestionsPage({
  searchParams,
}: PageProps<"/admin/questions">) {
  return (
    <>
      <PageHead
        eyebrow="Content"
        title="Published questions"
        intro="Everything students can see. Changes go live at once and are recorded in the audit log."
        actions={
          <Suspense>
            <ExportLink searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={8} />
          </div>
        }
      >
        <Questions searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type SP = PageProps<"/admin/questions">["searchParams"];

async function ExportLink({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && k !== "page" && k !== "edit") query.set(k, v);
  }
  return (
    <a href={`/admin/questions/export?${query}`} className="btn-secondary">
      Export CSV
    </a>
  );
}

async function Questions({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const params = await searchParams;
  const f = parseQuestionFilters(params);
  const editId = typeof params.edit === "string" ? params.edit : null;
  const [list, editing] = await Promise.all([
    getQuestionList(f),
    editId ? getQuestionForEdit(editId) : null,
  ]);

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === "string") next.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const q = next.toString();
    return q ? `/admin/questions?${q}` : "/admin/questions";
  };
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const from = list.total ? (f.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(list.total, f.page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-12 sm:px-8">
      <QuestionFilterBar
        companies={list.companies.map((c) => ({
          value: c.slug,
          label: c.name,
        }))}
        years={list.years}
        topics={list.topics.map((t) => ({ value: t.slug, label: t.name }))}
      />
      <p className="text-sm text-ink-3">
        {list.total} {list.total === 1 ? "question" : "questions"}
        {f.show === "unpublished" ? " unpublished" : ""} · sorted by most
        recently published
        {pages > 1 && ` · showing ${from}–${to}`}
      </p>

      {editing && (
        <EditQuestion
          key={editing.id}
          question={editing}
          tagNames={editing.tagNames}
          candidates={editing.candidates}
          closeHref={href({ edit: null })}
        />
      )}

      {list.rows.length === 0 ? (
        <p className="text-ink-3">No questions match these filters.</p>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  Question
                </th>
                <th scope="col" className={table.th}>
                  Where asked
                </th>
                <th scope="col" className={table.th}>
                  Type
                </th>
                <th scope="col" className={table.th}>
                  Sent by
                </th>
                <th scope="col" className={table.th}>
                  <SrOnly>Actions</SrOnly>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((q) => {
                const topics = q.tags.map((t) => t.tag.name).join(", ");
                const sent = q._count.sources;
                return (
                  <tr key={q.id} className={table.row}>
                    <td className={`${table.td} max-w-95`}>
                      <strong>{q.title}</strong>
                      <div className="text-[13px] text-ink-3">
                        {[topics, difficultyLabel[q.difficulty]]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className={`${table.td} text-sm`}>
                      <Link
                        href={`/admin/drives/${q.round.drive.id}`}
                        className="text-charcoal no-underline hover:text-crimson"
                      >
                        {q.round.drive.company.name} {q.round.drive.year} ·{" "}
                        {q.round.name}
                      </Link>
                    </td>
                    <td className={`${table.td} text-sm`}>
                      {questionTypeLabel[q.type]}
                    </td>
                    <td className={`${table.td} text-sm`}>
                      {sent === 0
                        ? "CDC"
                        : `${sent} ${sent === 1 ? "student" : "students"}`}
                    </td>
                    <td className={`${table.td} text-right whitespace-nowrap`}>
                      <span className="inline-flex gap-2">
                        <Link
                          href={`${href({ edit: q.id })}#edit`}
                          scroll={false}
                          className="btn-secondary min-h-9 px-3"
                        >
                          Edit
                        </Link>
                      </span>{" "}
                      <LiveToggle id={q.id} live={q.unpublishedAt === null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-3"
        >
          <span className="text-sm text-ink-3">
            Page {f.page} of {pages}
          </span>
          <span className="flex gap-2.5">
            {f.page > 1 && (
              <Link
                href={href({ page: String(f.page - 1), edit: null })}
                className="btn-secondary min-h-9 px-3"
              >
                Newer
              </Link>
            )}
            {f.page < pages && (
              <Link
                href={href({ page: String(f.page + 1), edit: null })}
                className="btn-secondary min-h-9 px-3"
              >
                Older
              </Link>
            )}
          </span>
        </nav>
      )}
    </div>
  );
}
