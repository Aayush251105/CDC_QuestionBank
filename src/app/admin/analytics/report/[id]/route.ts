import { driveTitle } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import { requireAdmin } from "@/server/admin/guard";
import { driveTitleSelect } from "@/server/admin/queries";
import { db } from "@/server/db";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (...cells: (string | number)[]) => cells.map(cell).join(",");

// A12 "Drive reports" > CSV: rounds, shortlist sizes, submissions, questions
// published and topics covered for one drive. Replaces the report the CDC
// writes by hand. (A PDF needs a new dependency: ask first, CLAUDE.md 2a.9.)
export async function GET(
  _req: Request,
  ctx: RouteContext<"/admin/analytics/report/[id]">,
) {
  await requireAdmin();
  const { id } = await ctx.params;
  const drive = await db.drive.findFirst({
    where: { id, verified: true },
    select: {
      ...driveTitleSelect,
      status: true,
      season: true,
      rounds: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          name: true,
          date: true,
          shortlistUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { _count: { select: { entries: true } } },
          },
          submissions: {
            where: { status: { notIn: ["DRAFT", "WITHDRAWN"] } },
            select: { status: true, verificationTag: true },
          },
          questions: {
            where: { unpublishedAt: null },
            select: { tags: { select: { tag: { select: { name: true } } } } },
          },
        },
      },
    },
  });
  if (!drive) return new Response("Not found", { status: 404 });

  const topics = new Map<string, number>();
  for (const r of drive.rounds) {
    for (const q of r.questions) {
      for (const t of q.tags)
        topics.set(t.tag.name, (topics.get(t.tag.name) ?? 0) + 1);
    }
  }

  const lines = [
    line("Drive report", driveTitle(drive)),
    line("Season", drive.season ?? ""),
    line("Status", drive.status),
    line("Generated", fullDate(new Date())),
    "",
    line(
      "Round",
      "Name",
      "Date",
      "Shortlisted",
      "Submissions",
      "Published",
      "Not published",
      "Pending",
      "Not on shortlist",
      "Questions live",
    ),
    ...drive.rounds.map((r) =>
      line(
        r.order,
        r.name,
        r.date ? fullDate(r.date) : "",
        r.shortlistUploads[0]?._count.entries ?? "",
        r.submissions.length,
        r.submissions.filter((s) => s.status === "PUBLISHED").length,
        r.submissions.filter((s) => s.status === "NOT_PUBLISHED").length,
        r.submissions.filter((s) => s.status === "PENDING_REVIEW").length,
        r.submissions.filter((s) => s.verificationTag === "NOT_FOUND").length,
        r.questions.length,
      ),
    ),
    "",
    line("Topic", "Questions"),
    ...[...topics.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => line(t, n)),
  ];
  const name = driveTitle(drive).replace(/[^\w]+/g, "_");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report_${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
