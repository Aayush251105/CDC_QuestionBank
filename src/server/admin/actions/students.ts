"use server";

import { refresh } from "next/cache";
import { BLOCK_REASONS } from "@/lib/admin";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

// A11 Block / Unblock. A blocked student can sign in but gets the 403 page
// on the student site; their waiting submissions leave the review queue
// (set aside, not deleted). The reason stays in the audit log.
export async function setStudentBlocked(
  userId: string,
  blocked: boolean,
  reason?: string,
) {
  const admin = await requireAdmin();
  const student = await db.user.findFirst({
    where: { id: userId, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      rollNo: true,
      email: true,
      blockedAt: true,
    },
  });
  if (!student || Boolean(student.blockedAt) === blocked) return;
  const why = BLOCK_REASONS.includes(reason ?? "") ? reason : "Other";
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: student.id },
      data: { blockedAt: blocked ? new Date() : null },
    });
    await logAction(
      {
        adminId: admin.id,
        action: blocked ? "block" : "unblock",
        targetType: "user",
        targetId: student.id,
        summary: `${student.name} (${student.rollNo ?? student.email})`,
        reason: blocked ? why : undefined,
        detail: blocked ? `Reason: ${why}` : undefined,
      },
      tx,
    );
  });
  refresh();
}
