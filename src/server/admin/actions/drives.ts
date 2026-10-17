"use server";

import { refresh } from "next/cache";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

// A02 Requests > Decline. The request leaves the list and its submissions
// are closed as not published; the student only ever sees "Reviewed"
// (CLAUDE.md 2a.2). Nothing is deleted.
export async function declineDriveRequest(driveId: string) {
  const admin = await requireAdmin();
  const drive = await db.drive.findFirst({
    where: { id: driveId, verified: false, requestResolvedAt: null },
    select: { id: true, roles: true, company: { select: { name: true } } },
  });
  if (!drive) return;

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.drive.update({
      where: { id: drive.id },
      data: { requestResolvedAt: now },
    });
    const closed = await tx.submission.updateMany({
      where: {
        round: { driveId: drive.id },
        status: { in: ["PENDING_REVIEW", "PROCESSING"] },
      },
      data: {
        status: "NOT_PUBLISHED",
        reviewStartedAt: now,
        reviewedAt: now,
      },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "request_decline",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: [drive.company.name, drive.roles.join(", ")]
          .filter(Boolean)
          .join(" · "),
        detail: `Drive request declined; ${closed.count} submission(s) closed`,
      },
      tx,
    );
  });
  refresh();
}
