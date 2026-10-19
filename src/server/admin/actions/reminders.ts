"use server";

import { refresh } from "next/cache";
import { chunk, driveTitle } from "@/lib/admin";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { driveTitleSelect } from "@/server/admin/queries";
import { getNotSubmitted } from "@/server/admin/reminders";
import { db } from "@/server/db";
import { mailEnabled, sendBcc } from "@/server/mail";

// Gmail allows about 500 recipients a day on a normal account; stay under it.
const MAX_PER_SEND = 400;
const BCC_BATCH = 50;

// A06 "Email reminder": one email (students in BCC) to everyone on the
// round's shortlist who has not submitted yet. Can be sent again any time;
// students drop off the list once they submit (CLAUDE.md 2a.15).
export async function sendReminders(
  driveId: string,
  roundId: string,
  subject: string,
  text: string,
): Promise<{ error: string | null; sent: number }> {
  const admin = await requireAdmin();
  if (!mailEnabled) {
    return {
      error:
        "Gmail is not set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.",
      sent: 0,
    };
  }
  const round = await db.round.findFirst({
    where: { id: roundId, driveId, drive: { verified: true } },
    select: { id: true, order: true, drive: { select: driveTitleSelect } },
  });
  if (!round) return { error: "Pick a round of this drive.", sent: 0 };
  const cleanSubject = subject.trim().slice(0, 200);
  const cleanText = text.trim().slice(0, 5000);
  if (!cleanSubject || !cleanText) {
    return { error: "The email needs a subject and a message.", sent: 0 };
  }

  const { pending } = await getNotSubmitted(round.id);
  if (pending.length === 0)
    return { error: "Everyone on this list has submitted.", sent: 0 };
  // Least reminded first, so a list longer than one day's limit is covered
  // over the next sends.
  const batch = [...pending]
    .sort(
      (a, b) =>
        a.reminders - b.reminders ||
        (a.lastReminded?.getTime() ?? 0) - (b.lastReminded?.getTime() ?? 0),
    )
    .slice(0, MAX_PER_SEND);

  let sent = 0;
  try {
    for (const group of chunk(batch, BCC_BATCH)) {
      await sendBcc({
        bcc: group.map((p) => p.email),
        subject: cleanSubject,
        text: cleanText,
      });
      await db.emailReminder.createMany({
        data: group.map((p) => ({
          roundId: round.id,
          userId: p.userId,
          email: p.email,
          sentById: admin.id,
        })),
      });
      sent += group.length;
    }
  } catch (e) {
    console.error("Reminder email failed", e);
  }

  if (sent > 0) {
    await logAction({
      adminId: admin.id,
      action: "reminder_email",
      targetType: "round",
      targetId: round.id,
      driveId,
      summary: `${driveTitle(round.drive)} · round ${round.order}`,
      detail: `Reminder emailed to ${sent} student(s) who had not submitted`,
    });
  }
  refresh();
  if (sent < batch.length) {
    return {
      error:
        sent === 0
          ? "Gmail refused the email. Check GMAIL_USER and the app password, then try again."
          : `Sent to ${sent} of ${batch.length}; Gmail stopped the rest. Try again later.`,
      sent,
    };
  }
  return {
    error:
      pending.length > batch.length
        ? `Sent to ${sent}. ${pending.length - sent} more are left: Gmail limits a day's sending, so send again tomorrow.`
        : null,
    sent,
  };
}
