import "server-only";
import { dayMonth, daysAgo, driveTitle, pinState, seasonOf } from "@/lib/admin";
import { db } from "@/server/db";
import { driveTitleSelect, pendingReview } from "./queries";

const DAY = 86_400_000;

// Everything on A01 Dashboard, from real rows (CLAUDE.md 2a.4).
export async function getDashboard(now: Date = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const season = seasonOf(now);

  const [
    pending,
    weekTotal,
    weekWithPin,
    openDrives,
    published,
    needPin,
    requests,
    upcoming,
  ] = await Promise.all([
    db.submission.findMany({
      where: pendingReview,
      orderBy: { submittedAt: "asc" },
      select: {
        submittedAt: true,
        createdAt: true,
        verificationTag: true,
        round: { select: { order: true, name: true } },
        drive: {
          select: {
            ...driveTitleSelect,
            rounds: {
              select: { _count: { select: { shortlistUploads: true } } },
            },
          },
        },
      },
    }),
    db.submission.count({
      where: {
        submittedAt: { gte: weekAgo },
        round: { drive: { verified: true } },
      },
    }),
    db.submission.count({
      where: {
        submittedAt: { gte: weekAgo },
        enteredWithPin: true,
        round: { drive: { verified: true } },
      },
    }),
    db.drive.findMany({
      where: { status: "OPEN", verified: true },
      select: { requirePin: true, submissionPin: true },
    }),
    db.question.count({
      where: { publishedAt: { gte: season.start }, unpublishedAt: null },
    }),
    db.drive.findMany({
      where: {
        verified: true,
        status: { in: ["DRAFT", "OPEN"] },
        requirePin: true,
        submissionPin: null,
      },
      orderBy: [{ year: "desc" }, { createdAt: "asc" }],
      select: {
        ...driveTitleSelect,
        rounds: {
          where: { date: { gte: today } },
          orderBy: { date: "asc" },
          take: 1,
          select: { name: true, date: true },
        },
      },
    }),
    db.drive.findMany({
      where: { verified: false, requestResolvedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.round.findMany({
      where: {
        date: { gte: today },
        drive: { verified: true, status: { not: "CLOSED" } },
      },
      orderBy: [{ date: "asc" }, { order: "asc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        date: true,
        drive: {
          select: {
            ...driveTitleSelect,
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
              },
            },
          },
        },
      },
    }),
  ]);

  // Waiting for review, one row per drive
  type QueueRow = {
    driveId: string;
    drive: string;
    rounds: { order: number; name: string }[];
    n: number;
    verified: number;
    likely: number;
    notFound: number;
    oldest: Date;
    hasShortlist: boolean;
  };
  const queue = new Map<string, QueueRow>();
  for (const s of pending) {
    const d = s.drive;
    const sent = s.submittedAt ?? s.createdAt;
    const row = queue.get(d.id) ?? {
      driveId: d.id,
      drive: driveTitle(d),
      rounds: [],
      n: 0,
      verified: 0,
      likely: 0,
      notFound: 0,
      oldest: sent,
      hasShortlist: d.rounds.some((r) => r._count.shortlistUploads > 0),
    };
    row.n++;
    if (s.verificationTag === "VERIFIED") row.verified++;
    if (s.verificationTag === "LIKELY") row.likely++;
    if (s.verificationTag === "NOT_FOUND") row.notFound++;
    if (sent < row.oldest) row.oldest = sent;
    const round = s.round;
    if (round && !row.rounds.some((r) => r.order === round.order)) {
      row.rounds.push({ order: round.order, name: round.name });
    }
    queue.set(d.id, row);
  }
  const queueRows = [...queue.values()].map((r) => ({
    ...r,
    rounds: r.rounds
      .sort((a, b) => a.order - b.order)
      .map((x) => x.name)
      .join(", "),
    age: daysAgo(r.oldest, now),
  }));

  // Needs attention
  type Alert = {
    kind: string;
    tone: "crimson" | "amber" | "grey";
    title: string;
    body: string;
    action: string;
    href: string;
  };
  const alerts: Alert[] = [];
  for (const d of needPin) {
    const next = d.rounds[0];
    alerts.push({
      kind: "PIN",
      tone: "crimson",
      title: `${driveTitle(d)} has no PIN.`,
      body: next?.date
        ? `Its ${next.name.toLowerCase()} is on ${dayMonth(next.date)}.`
        : "Students cannot submit to it until it has one.",
      action: "Generate PIN",
      href: `/admin/drives/${d.id}/pin`,
    });
  }
  for (const r of queueRows.filter((r) => !r.hasShortlist)) {
    alerts.push({
      kind: "Shortlist",
      tone: "amber",
      title: `${r.drive} has no shortlist.`,
      body: "Submissions cannot be matched yet.",
      action: "Upload shortlist",
      href: `/admin/drives/${r.driveId}/shortlist`,
    });
  }
  for (const r of queueRows.filter((r) => r.notFound > 0)) {
    alerts.push({
      kind: "Possible PIN leak",
      tone: "crimson",
      title: `${r.drive}: ${r.notFound} of ${r.n} waiting submissions are not on the shortlist.`,
      body: "",
      action: "Check the PIN page",
      href: `/admin/drives/${r.driveId}/pin`,
    });
  }
  if (requests.length > 0) {
    const oldest = daysAgo(requests[0].createdAt, now);
    alerts.push({
      kind: "Requests",
      tone: "grey",
      title: `${requests.length} drive ${requests.length === 1 ? "request" : "requests"} from students.`,
      body: oldest.endsWith("days")
        ? `Oldest is ${oldest} old.`
        : `Oldest is from ${oldest === "Today" || oldest === "Yesterday" ? oldest.toLowerCase() : oldest}.`,
      action: "See requests",
      href: "/admin/drives?tab=requests",
    });
  }

  // Coming up
  const comingUp = upcoming.map((r) => {
    const lists = r.drive.rounds.filter((x) => x.shortlistUploads[0]);
    const students = Math.max(
      0,
      ...lists.map((x) => x.shortlistUploads[0]._count.entries),
    );
    return {
      id: r.id,
      date: r.date!,
      driveId: r.drive.id,
      drive: driveTitle(r.drive),
      round: r.name,
      pin: pinState(r.drive, now),
      shortlist: lists.length
        ? `${students} students, round ${lists.map((x) => x.order).join(" and ")}`
        : "Not uploaded",
    };
  });

  const oldestPending = pending[0]
    ? daysAgo(pending[0].submittedAt ?? pending[0].createdAt, now)
    : null;

  return {
    season: season.label,
    kpis: {
      waiting: pending.length,
      oldestPending,
      weekTotal,
      weekWithPin,
      openDrives: openDrives.length,
      openNeedPin: openDrives.filter((d) => d.requirePin && !d.submissionPin)
        .length,
      published,
    },
    queue: queueRows,
    alerts,
    comingUp,
  };
}
