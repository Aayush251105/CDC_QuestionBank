import "server-only";
import type { DriveStatus } from "@/generated/prisma/enums";
import { driveTitle, pinState } from "@/lib/admin";
import { db } from "@/server/db";
import { driveTitleSelect } from "./queries";

export const DRIVE_TABS = [
  "open",
  "draft",
  "closed",
  "all",
  "requests",
] as const;
export type DriveTab = (typeof DRIVE_TABS)[number];

const tabStatus: Record<Exclude<DriveTab, "all" | "requests">, DriveStatus> = {
  open: "OPEN",
  draft: "DRAFT",
  closed: "CLOSED",
};

export function parseDriveTab(value: unknown): DriveTab {
  return DRIVE_TABS.includes(value as DriveTab) ? (value as DriveTab) : "open";
}

// "rounds 1–2", "round 1", "rounds 1, 3"
function roundList(orders: number[]) {
  if (orders.length === 1) return `round ${orders[0]}`;
  const consecutive = orders.every(
    (o, i) => i === 0 || o === orders[i - 1] + 1,
  );
  return consecutive
    ? `rounds ${orders[0]}–${orders[orders.length - 1]}`
    : `rounds ${orders.join(", ")}`;
}

// A02 Drives: CDC drives by status, with tab counts.
export async function getDriveList(filters: {
  tab: DriveTab;
  q: string;
  year: number | null;
}) {
  const where = {
    verified: true,
    ...(filters.q && {
      company: { name: { contains: filters.q, mode: "insensitive" as const } },
    }),
    ...(filters.year && { year: filters.year }),
  };

  const [counts, requestCount, years, drives] = await Promise.all([
    db.drive.groupBy({ by: ["status"], where, _count: true }),
    db.drive.count({ where: { verified: false, requestResolvedAt: null } }),
    db.drive.findMany({
      where: { verified: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
      select: { year: true },
    }),
    filters.tab === "requests"
      ? Promise.resolve([])
      : db.drive.findMany({
          where:
            filters.tab === "all"
              ? where
              : { ...where, status: tabStatus[filters.tab] },
          orderBy: [
            { year: "desc" },
            { company: { name: "asc" } },
            { sequence: "asc" },
          ],
          select: {
            ...driveTitleSelect,
            ctcBand: true,
            status: true,
            submissionPin: true,
            pinEnabled: true,
            closesAt: true,
            rounds: {
              orderBy: { order: "asc" },
              select: {
                order: true,
                shortlistUploads: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { _count: { select: { entries: true } } },
                },
                submissions: {
                  where: { status: { notIn: ["DRAFT", "WITHDRAWN"] } },
                  select: { status: true },
                },
              },
            },
          },
        }),
  ]);

  const count = (s: DriveStatus) =>
    counts.find((c) => c.status === s)?._count ?? 0;
  const tabCounts: Record<DriveTab, number> = {
    open: count("OPEN"),
    draft: count("DRAFT"),
    closed: count("CLOSED"),
    all: counts.reduce((n, c) => n + c._count, 0),
    requests: requestCount,
  };

  const rows = drives.map((d) => {
    const lists = d.rounds.filter((r) => r.shortlistUploads[0]);
    const subs = d.rounds.flatMap((r) => r.submissions);
    return {
      id: d.id,
      title: driveTitle(d),
      sub: [d.roles.join(", "), d.ctcBand && `CTC band ${d.ctcBand}`]
        .filter(Boolean)
        .join(" · "),
      rounds: d.rounds.length,
      pin: pinState(d),
      shortlist: lists.length
        ? `${Math.max(...lists.map((r) => r.shortlistUploads[0]._count.entries))} · ${roundList(lists.map((r) => r.order))}`
        : "Not uploaded",
      submissions: subs.length,
      pending: subs.filter((s) => s.status === "PENDING_REVIEW").length,
      status: d.status,
    };
  });

  return { tabCounts, years: years.map((y) => y.year), rows };
}

// A02 Requests: drives students created because the CDC had not added them
// (CLAUDE.md 2a.1).
export async function getDriveRequests() {
  const drives = await db.drive.findMany({
    where: { verified: false, requestResolvedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      roles: true,
      company: { select: { name: true } },
      createdBy: { select: { name: true, gradYear: true } },
      rounds: {
        orderBy: { order: "asc" },
        select: { date: true, _count: { select: { submissions: true } } },
      },
    },
  });

  return drives.map((d) => ({
    id: d.id,
    company: d.company.name,
    roles: d.roles.join(", "),
    testDate: d.rounds[0]?.date ?? null,
    askedBy: d.createdBy
      ? [d.createdBy.name, d.createdBy.gradYear].filter(Boolean).join(", ")
      : "A student",
    received: d.createdAt,
    submissions: d.rounds.reduce((n, r) => n + r._count.submissions, 0),
  }));
}
