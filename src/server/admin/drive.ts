import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { driveTitle, pinState } from "@/lib/admin";
import { db } from "@/server/db";
import { driveTitleSelect, pendingReview } from "./queries";

// The header every drive page shares (A04 to A07): title, status, window
// and the Review tab count. Cached for one request. Only CDC drives;
// student drive requests are handled from Drives > Requests.
export const getDriveHeader = cache(async (id: string) => {
  const drive = await db.drive.findFirst({
    where: { id, verified: true },
    select: {
      ...driveTitleSelect,
      status: true,
      season: true,
      eligibility: true,
      opensAt: true,
      closesAt: true,
      requirePin: true,
      submissionPin: true,
      pinEnabled: true,
      pinCreatedAt: true,
      _count: { select: { rounds: true } },
    },
  });
  if (!drive) notFound();
  const pending = await db.submission.count({
    where: { ...pendingReview, round: { driveId: id } },
  });
  return {
    ...drive,
    title: driveTitle(drive),
    pin: pinState(drive),
    pending,
  };
});

export type DriveHeader = Awaited<ReturnType<typeof getDriveHeader>>;

// A04 Overview: cards, rounds, submissions by check and recent activity.
export async function getDriveOverview(id: string, pin: string | null) {
  const [rounds, submissions, activity] = await Promise.all([
    db.round.findMany({
      where: { driveId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        name: true,
        date: true,
        platform: true,
        durationMin: true,
        shortlistUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, _count: { select: { entries: true } } },
        },
        _count: {
          select: {
            questions: { where: { unpublishedAt: null } },
            submissions: {
              where: { status: { notIn: ["DRAFT", "WITHDRAWN"] } },
            },
          },
        },
      },
    }),
    db.submission.findMany({
      where: {
        round: { driveId: id },
        status: { notIn: ["DRAFT", "WITHDRAWN"] },
      },
      select: {
        userId: true,
        status: true,
        enteredWithPin: true,
        pinUsed: true,
        verificationTag: true,
      },
    }),
    db.reviewAction.findMany({
      where: { driveId: id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        action: true,
        summary: true,
        detail: true,
        createdAt: true,
        admin: { select: { name: true, role: true } },
      },
    }),
  ]);

  const lists = rounds.filter((r) => r.shortlistUploads[0]);
  const lastUpload = lists
    .map((r) => r.shortlistUploads[0].createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const count = (pred: (s: (typeof submissions)[number]) => boolean) =>
    submissions.filter(pred).length;

  return {
    rounds,
    shortlist: {
      students: Math.max(
        0,
        ...lists.map((r) => r.shortlistUploads[0]._count.entries),
      ),
      perRound: lists.map(
        (r) => `Round ${r.order}: ${r.shortlistUploads[0]._count.entries}`,
      ),
      updated: lastUpload ?? null,
    },
    review: {
      published: count((s) => s.status === "PUBLISHED"),
      notPublished: count((s) => s.status === "NOT_PUBLISHED"),
    },
    checks: {
      total: submissions.length,
      verified: count((s) => s.verificationTag === "VERIFIED"),
      likely: count((s) => s.verificationTag === "LIKELY"),
      notFound: count((s) => s.verificationTag === "NOT_FOUND"),
      noPin: count((s) => !s.enteredWithPin),
      withPin: count((s) => s.enteredWithPin),
    },
    // Students whose submissions came in with the current PIN
    pinUsers: pin
      ? new Set(
          submissions.filter((s) => s.pinUsed === pin).map((s) => s.userId),
        ).size
      : 0,
    activity,
  };
}

// Values for the Edit drive form.
export async function getDriveForEdit(id: string) {
  const drive = await db.drive.findFirst({
    where: { id, verified: true },
    select: {
      ...driveTitleSelect,
      season: true,
      ctcBand: true,
      eligibility: true,
      opensAt: true,
      closesAt: true,
      requirePin: true,
      rounds: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          date: true,
          platform: true,
          durationMin: true,
          _count: {
            select: {
              submissions: true,
              questions: true,
              shortlistUploads: true,
            },
          },
        },
      },
    },
  });
  if (!drive) notFound();
  return drive;
}
