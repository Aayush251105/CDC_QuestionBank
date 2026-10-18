import "server-only";
import { driveLabel } from "@/lib/drives";
import { reviewedMessage } from "@/lib/notifications";
import { db } from "@/server/db";

// Creating notifications lives here so the rules stay in one place
// (CLAUDE.md 2a.12). The admin side calls notifyReviewed when it finishes a
// review; the other kinds are added with the admin side.

export async function notifyReviewed(submissionId: string) {
  const s = await db.submission.findUniqueOrThrow({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      round: { select: { name: true } },
      drive: {
        select: {
          year: true,
          sequence: true,
          companyId: true,
          company: { select: { name: true } },
        },
      },
    },
  });
  const visits = await db.drive.count({
    where: { companyId: s.drive.companyId, year: s.drive.year },
  });
  await db.notification.create({
    data: {
      userId: s.userId,
      kind: "REVIEWED",
      message: reviewedMessage({
        company: s.drive.company.name,
        drive: driveLabel(s.drive.year, s.drive.sequence, visits),
        round: s.round?.name ?? null,
      }),
      link: `/me/submissions/${s.id}`,
    },
  });
}
