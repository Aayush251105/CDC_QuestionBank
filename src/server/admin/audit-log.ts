import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { driveTitle } from "@/lib/admin";
import { AUDIT_GROUPS, type AuditGroup } from "@/lib/audit";
import { db } from "@/server/db";
import { driveTitleSelect } from "./queries";

export const AUDIT_PAGE_SIZE = 50;
export const PERIODS = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  all: "All time",
} as const;
export type Period = keyof typeof PERIODS;

export type AuditFilters = {
  group: AuditGroup | null;
  admin: string;
  drive: string;
  period: Period;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export function parseAuditFilters(params: Params): AuditFilters {
  const group = one(params.type) as AuditGroup;
  const period = one(params.period) as Period;
  return {
    group: Object.hasOwn(AUDIT_GROUPS, group) ? group : null,
    admin: one(params.admin),
    drive: one(params.drive),
    // A link from a drive opens its whole history; otherwise the last week.
    period: Object.hasOwn(PERIODS, period)
      ? period
      : one(params.drive)
        ? "all"
        : "7",
    page: Math.max(1, Number(one(params.page)) || 1),
  };
}

export function auditWhere(f: AuditFilters): Prisma.ReviewActionWhereInput {
  return {
    ...(f.group && { action: { in: [...AUDIT_GROUPS[f.group].actions] } }),
    ...(f.admin && { adminId: f.admin }),
    ...(f.drive && { driveId: f.drive }),
    ...(f.period !== "all" && {
      createdAt: { gte: new Date(Date.now() - Number(f.period) * 86_400_000) },
    }),
  };
}

export const auditSelect = {
  id: true,
  createdAt: true,
  action: true,
  targetType: true,
  summary: true,
  detail: true,
  reason: true,
  admin: { select: { name: true } },
} satisfies Prisma.ReviewActionSelect;

// A14: one page of the log, newest first, plus the filter options.
export async function getAuditLog(f: AuditFilters) {
  const where = auditWhere(f);
  const [total, rows, admins, driveIds] = await Promise.all([
    db.reviewAction.count({ where }),
    db.reviewAction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: auditSelect,
    }),
    db.user.findMany({
      where: { reviewActions: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.reviewAction.findMany({
      where: { driveId: { not: null } },
      distinct: ["driveId"],
      select: { driveId: true },
    }),
  ]);
  const drives = await db.drive.findMany({
    where: { id: { in: driveIds.map((d) => d.driveId!) } },
    orderBy: [{ year: "desc" }, { company: { name: "asc" } }],
    select: driveTitleSelect,
  });
  return {
    total,
    rows,
    admins,
    drives: drives.map((d) => ({ id: d.id, title: driveTitle(d) })),
  };
}
