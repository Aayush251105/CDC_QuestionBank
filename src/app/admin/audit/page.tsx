import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead, Tag, table } from "@/components/admin/ui";
import { AUDIT_GROUPS, auditTag, auditWhen } from "@/lib/audit";
import {
  AUDIT_PAGE_SIZE,
  getAuditLog,
  parseAuditFilters,
  PERIODS,
} from "@/server/admin/audit-log";
import { requireAdmin } from "@/server/admin/guard";
import { AuditFilters } from "./AuditFilters";

export const metadata: Metadata = {
  title: "Audit log · Admin · Placement Question Bank",
};

const intro =
  "Every approval, edit, rejection, PIN action and role change, with who and when. Entries cannot be edited or deleted.";

type SP = PageProps<"/admin/audit">["searchParams"];

// A14 Audit log: who did what and when, filterable and exportable.
export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHead
        eyebrow="Insights"
        title="Audit log"
        intro={intro}
        actions={
          <Suspense>
            <ExportLink searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={9} />
          </div>
        }
      >
        <AuditLog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExportLink({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && k !== "page") q.set(k, v);
  }
  return (
    <a href={`/admin/audit/export?${q}`} className="btn-secondary">
      Export CSV
    </a>
  );
}

async function AuditLog({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const params = await searchParams;
  const f = parseAuditFilters(params);
  const log = await getAuditLog(f);

  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === "string") next.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    return `/admin/audit?${next}`;
  };
  const shownTo = Math.min(log.total, f.page * AUDIT_PAGE_SIZE);
  const hasOlder = shownTo < log.total;

  return (
    <div className="flex flex-col gap-4.5 px-5 pt-6 pb-12 sm:px-8">
      <AuditFilters
        groups={Object.entries(AUDIT_GROUPS).map(([value, g]) => ({
          value,
          label: g.label,
        }))}
        admins={log.admins.map((a) => ({ value: a.id, label: a.name }))}
        drives={log.drives.map((d) => ({ value: d.id, label: d.title }))}
        periods={Object.entries(PERIODS).map(([value, label]) => ({
          value,
          label,
        }))}
        period={f.period}
      />

      {log.rows.length === 0 ? (
        <p className="text-ink-3">
          Nothing recorded for these filters.{" "}
          {f.period !== "all" && (
            <Link href={href({ period: "all" })}>Show all time</Link>
          )}
        </p>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  When
                </th>
                <th scope="col" className={table.th}>
                  Admin
                </th>
                <th scope="col" className={table.th}>
                  Action
                </th>
                <th scope="col" className={table.th}>
                  On
                </th>
                <th scope="col" className={table.th}>
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {log.rows.map((r) => {
                const tag = auditTag(r.action);
                return (
                  <tr key={r.id} className={table.row}>
                    <td
                      className={`${table.td} text-sm whitespace-nowrap text-ink-3`}
                    >
                      {auditWhen(r.createdAt)}
                    </td>
                    <td className={`${table.td} text-sm`}>{r.admin.name}</td>
                    <td className={table.td}>
                      <Tag tone={tag.tone}>{tag.tag}</Tag>
                    </td>
                    <td className={`${table.td} text-sm font-bold`}>
                      {r.summary ?? r.targetType}
                    </td>
                    <td className={`${table.td} text-sm`}>
                      {r.detail ?? (r.reason ? `Reason: ${r.reason}` : "")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {log.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-3">
            Showing {(f.page - 1) * AUDIT_PAGE_SIZE + 1}–{shownTo} of{" "}
            {log.total} {log.total === 1 ? "entry" : "entries"}
          </span>
          <span className="flex gap-2.5">
            {f.page > 1 ? (
              <Link
                href={href({ page: String(f.page - 1) })}
                className="btn-secondary min-h-9 px-3"
              >
                Newer
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="btn-secondary min-h-9 px-3 opacity-50"
              >
                Newer
              </span>
            )}
            {hasOlder ? (
              <Link
                href={href({ page: String(f.page + 1) })}
                className="btn-secondary min-h-9 px-3"
              >
                Older
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="btn-secondary min-h-9 px-3 opacity-50"
              >
                Older
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
