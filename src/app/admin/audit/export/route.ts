import { auditTag } from "@/lib/audit";
import {
  auditSelect,
  auditWhere,
  parseAuditFilters,
} from "@/server/admin/audit-log";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

const cell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

// A14 "Export CSV": the entries matching the current filters.
export async function GET(req: Request) {
  await requireAdmin();
  const f = parseAuditFilters(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const rows = await db.reviewAction.findMany({
    where: auditWhere(f),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: auditSelect,
  });
  const lines = [
    "When,Admin,Action,On,Detail,Reason",
    ...rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.admin.name,
        auditTag(r.action).tag,
        r.summary ?? r.targetType,
        r.detail ?? "",
        r.reason ?? "",
      ]
        .map(cell)
        .join(","),
    ),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
