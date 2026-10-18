import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

const cell = (v: string | null) =>
  v === null ? "" : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

const matchLabel = {
  ROLL_NO: "Roll number",
  EMAIL: "SNU email",
  NAME: "Name only",
  NONE: "No match",
} as const;

// A06 "Earlier uploads" > Download: the rows we kept from that file, as CSV
// (the file itself is never stored).
export async function GET(
  _req: Request,
  ctx: RouteContext<"/admin/drives/[id]/shortlist/[upload]">,
) {
  await requireAdmin();
  const { id, upload } = await ctx.params;
  const found = await db.shortlistUpload.findFirst({
    where: { id: upload, round: { driveId: id } },
    select: {
      fileName: true,
      entries: {
        orderBy: { rowNo: "asc" },
        select: {
          rowNo: true,
          rollNo: true,
          email: true,
          name: true,
          match: true,
        },
      },
    },
  });
  if (!found) return new Response("Not found", { status: 404 });

  const lines = [
    "Row,Roll number,Name,Email,Matched by",
    ...found.entries.map((e) =>
      [
        String(e.rowNo),
        cell(e.rollNo),
        cell(e.name),
        cell(e.email),
        matchLabel[e.match],
      ].join(","),
    ),
  ];
  const fileName = found.fileName.replace(/[^\w.-]+/g, "_");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
