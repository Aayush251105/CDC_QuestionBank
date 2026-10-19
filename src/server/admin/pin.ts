import "server-only";
import { generatePin } from "@/lib/pin";
import { db } from "@/server/db";

// A PIN no other drive has. Six digits give a million options, so a clash
// is rare; try a few times.
export async function freshPin() {
  for (let i = 0; i < 10; i++) {
    const pin = generatePin();
    const taken = await db.drive.findUnique({
      where: { submissionPin: pin },
      select: { id: true },
    });
    if (!taken) return pin;
  }
  throw new Error("Could not find a free PIN");
}

const DAY = 86_400_000;

// A05 "How it is being used" and "Used by people not on the shortlist".
// Submissions keep the PIN they came in with, so a regenerated PIN starts
// from zero and old submissions keep their tags.
export async function getPinUsage(driveId: string, pin: string | null) {
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [withPin, failed, generated] = await Promise.all([
    pin
      ? db.submission.findMany({
          where: {
            round: { driveId },
            pinUsed: pin,
            status: { notIn: ["DRAFT", "WITHDRAWN"] },
          },
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            userId: true,
            status: true,
            submittedAt: true,
            createdAt: true,
            verificationTag: true,
            round: { select: { name: true } },
            user: {
              select: {
                name: true,
                email: true,
                rollNo: true,
                programme: true,
                branch: true,
                gradYear: true,
              },
            },
          },
        })
      : [],
    // Refused tries on this drive's PIN (closed, switched off or paused)
    db.pinAttempt.findMany({
      where: { driveId, success: false, createdAt: { gte: weekAgo } },
      select: { userId: true },
    }),
    db.reviewAction.findFirst({
      where: { driveId, action: { in: ["pin_generate", "pin_regenerate"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, admin: { select: { name: true } } },
    }),
  ]);

  const failsByUser = new Map<string, number>();
  for (const f of failed) {
    failsByUser.set(f.userId, (failsByUser.get(f.userId) ?? 0) + 1);
  }
  const outsiders = withPin.filter((s) => s.verificationTag === "NOT_FOUND");

  return {
    students: new Set(withPin.map((s) => s.userId)).size,
    submissions: withPin.length,
    outsiderCount: new Set(outsiders.map((s) => s.userId)).size,
    wrongTries: failed.length,
    paused: [...failsByUser.values()].filter((n) => n >= 5).length,
    outsiders,
    generated,
  };
}
