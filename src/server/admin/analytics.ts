import "server-only";
import { driveTitle } from "@/lib/admin";
import { db } from "@/server/db";
import { driveTitleSelect } from "./queries";

const DAY = 86_400_000;

// A drive belongs to the placement season that starts in its year:
// 2025 drives make up season 2025–26.
export const seasonLabel = (year: number) =>
  `${year}–${String(year + 1).slice(2)}`;

export async function seasonYears() {
  const years = await db.drive.findMany({
    where: { verified: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
    select: { year: true },
  });
  return years.map((y) => y.year);
}

// A12: coverage, submissions, questions and review speed for one season,
// all from real rows (CLAUDE.md 2a.4: no view counts).
export async function getAnalytics(year: number) {
  const drives = await db.drive.findMany({
    where: { verified: true, year, status: { not: "DRAFT" } },
    orderBy: [{ company: { name: "asc" } }, { sequence: "asc" }],
    select: {
      ...driveTitleSelect,
      status: true,
      requirePin: true,
      submissionPin: true,
      rounds: {
        select: {
          _count: { select: { questions: { where: { unpublishedAt: null } } } },
          submissions: {
            where: { status: { notIn: ["DRAFT", "WITHDRAWN"] } },
            select: {
              enteredWithPin: true,
              submittedAt: true,
              reviewedAt: true,
              status: true,
              rawQuestions: { select: { decision: true } },
            },
          },
        },
      },
    },
  });

  const rows = drives.map((d) => {
    const subs = d.rounds.flatMap((r) => r.submissions);
    return {
      id: d.id,
      title: driveTitle(d),
      short: `${d.company.name} ${d.year}${d.sequence > 1 ? ` · ${String.fromCharCode(64 + d.sequence)}` : ""}`,
      status: d.status,
      noPin: d.requirePin && !d.submissionPin,
      questions: d.rounds.reduce((n, r) => n + r._count.questions, 0),
      subs,
    };
  });
  const subs = rows.flatMap((r) => r.subs);
  const approved = subs
    .flatMap((s) => s.rawQuestions)
    .filter((q) => q.decision === "APPROVED" || q.decision === "MERGED").length;

  // Median days from sent to decided, over reviewed submissions
  const waits = subs
    .filter(
      (s) => s.submittedAt && s.reviewedAt && s.status !== "PENDING_REVIEW",
    )
    .map((s) => (s.reviewedAt!.getTime() - s.submittedAt!.getTime()) / DAY)
    .sort((a, b) => a - b);
  const median = waits.length
    ? waits.length % 2
      ? waits[(waits.length - 1) / 2]
      : (waits[waits.length / 2 - 1] + waits[waits.length / 2]) / 2
    : null;

  return {
    drives: rows.length,
    drivesWithQuestions: rows.filter((r) => r.questions > 0).length,
    submissions: subs.length,
    withPin: subs.filter((s) => s.enteredWithPin).length,
    published: rows.reduce((n, r) => n + r.questions, 0),
    approved,
    medianDays: median,
    perDrive: rows
      .map((r) => ({
        id: r.id,
        label: r.short,
        n: r.subs.length,
        noPin: r.noPin,
      }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)),
    reports: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      questions: r.questions,
    })),
  };
}
