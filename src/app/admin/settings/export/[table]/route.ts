import { driveTitle } from "@/lib/admin";
import { requireSuperAdmin } from "@/server/admin/guard";
import { driveTitleSelect } from "@/server/admin/queries";
import { db } from "@/server/db";

const cell = (v: unknown) => {
  const s =
    v === null || v === undefined
      ? ""
      : v instanceof Date
        ? v.toISOString()
        : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) =>
  rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

// A13 "Export all data": one CSV per table for CDC records. Shortlists are
// left out; submissions list who sent what, not the question text.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/admin/settings/export/[table]">,
) {
  await requireSuperAdmin();
  const { table } = await ctx.params;
  let rows: unknown[][];

  if (table === "drives") {
    const drives = await db.drive.findMany({
      orderBy: [{ year: "desc" }, { company: { name: "asc" } }],
      select: {
        ...driveTitleSelect,
        status: true,
        verified: true,
        season: true,
        opensAt: true,
        closesAt: true,
        requirePin: true,
        _count: { select: { rounds: true } },
      },
    });
    rows = [
      [
        "Drive",
        "Company",
        "Year",
        "Status",
        "CDC drive",
        "Season",
        "Opens",
        "Closes",
        "Require PIN",
        "Rounds",
      ],
      ...drives.map((d) => [
        driveTitle(d),
        d.company.name,
        d.year,
        d.status,
        d.verified ? "Yes" : "Student request",
        d.season,
        d.opensAt,
        d.closesAt,
        d.requirePin ? "Yes" : "No",
        d._count.rounds,
      ]),
    ];
  } else if (table === "questions") {
    const questions = await db.question.findMany({
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        difficulty: true,
        publishedAt: true,
        unpublishedAt: true,
        round: { select: { name: true, drive: { select: driveTitleSelect } } },
        _count: { select: { sources: true } },
      },
    });
    rows = [
      [
        "Id",
        "Title",
        "Drive",
        "Round",
        "Type",
        "Difficulty",
        "Sources",
        "Published",
        "Unpublished",
      ],
      ...questions.map((q) => [
        q.id,
        q.title,
        driveTitle(q.round.drive),
        q.round.name,
        q.type,
        q.difficulty,
        q._count.sources,
        q.publishedAt,
        q.unpublishedAt,
      ]),
    ];
  } else if (table === "submissions") {
    const subs = await db.submission.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        enteredWithPin: true,
        verificationTag: true,
        submittedAt: true,
        reviewedAt: true,
        credit: true,
        user: { select: { email: true, rollNo: true } },
        drive: { select: driveTitleSelect },
        round: { select: { name: true } },
        _count: { select: { rawQuestions: true } },
      },
    });
    rows = [
      [
        "Id",
        "Student email",
        "Roll number",
        "Drive",
        "Round",
        "Status",
        "Via PIN",
        "Shortlist",
        "Questions",
        "Credit",
        "Sent",
        "Reviewed",
      ],
      ...subs.map((s) => [
        s.id,
        s.user.email,
        s.user.rollNo,
        driveTitle(s.drive),
        s.round?.name ?? "",
        s.status,
        s.enteredWithPin ? "Yes" : "No",
        s.verificationTag,
        s._count.rawQuestions,
        s.credit ? "Yes" : "No",
        s.submittedAt,
        s.reviewedAt,
      ]),
    ];
  } else if (table === "audit") {
    const log = await db.reviewAction.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        action: true,
        targetType: true,
        summary: true,
        detail: true,
        reason: true,
        admin: { select: { name: true, email: true } },
      },
    });
    rows = [
      ["When", "Admin", "Admin email", "Action", "On", "Detail", "Reason"],
      ...log.map((l) => [
        l.createdAt,
        l.admin.name,
        l.admin.email,
        l.action,
        l.summary ?? l.targetType,
        l.detail,
        l.reason,
      ]),
    ];
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
