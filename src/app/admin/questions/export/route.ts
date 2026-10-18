import { difficultyLabel, questionTypeLabel } from "@/lib/labels";
import { requireAdmin } from "@/server/admin/guard";
import {
  parseQuestionFilters,
  questionRowSelect,
  questionWhere,
} from "@/server/admin/questions";
import { db } from "@/server/db";

const cell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

// A09 "Export CSV": the questions matching the current filters, with their
// full text. This is the only way questions leave the site (CLAUDE.md
// 2a.10), so it is admin only.
export async function GET(req: Request) {
  await requireAdmin();
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseQuestionFilters(params);
  const rows = await db.question.findMany({
    where: questionWhere(f),
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    select: questionRowSelect,
  });

  const lines = [
    "Title,Question text,Company,Year,Round,Type,Difficulty,Topics,Sent by,Published,Status",
    ...rows.map((q) =>
      [
        q.title,
        q.bodyMarkdown,
        q.round.drive.company.name,
        String(q.round.drive.year),
        q.round.name,
        questionTypeLabel[q.type],
        difficultyLabel[q.difficulty],
        q.tags.map((t) => t.tag.name).join("; "),
        String(q._count.sources),
        q.publishedAt.toISOString().slice(0, 10),
        q.unpublishedAt ? "Unpublished" : "Live",
      ]
        .map(cell)
        .join(","),
    ),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questions.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
