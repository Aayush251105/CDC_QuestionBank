import "server-only";
import { db } from "@/server/db";

// A student's own draft, or null. Always filtered by userId so nobody can
// open someone else's submission by guessing an id.
export async function getOwnSubmission(id: string, userId: string) {
  return db.submission.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      role: true,
      roundId: true,
      enteredWithPin: true,
      lastStep: true,
      mode: true,
      testDate: true,
      platform: true,
      durationMin: true,
      sections: true,
      notes: true,
      drive: {
        select: {
          id: true,
          year: true,
          sequence: true,
          roles: true,
          status: true,
          verified: true,
          companyId: true,
          company: { select: { name: true } },
          rounds: {
            // The CDC's rounds, plus any this student added themselves.
            where: { OR: [{ verified: true }, { createdById: userId }] },
            orderBy: { order: "asc" },
            select: {
              id: true,
              name: true,
              type: true,
              date: true,
              platform: true,
              durationMin: true,
              roles: true,
              verified: true,
            },
          },
        },
      },
    },
  });
}

// The newest unfinished draft, for "Continue the draft" on S1.
export async function getLatestDraft(userId: string) {
  return db.submission.findFirst({
    where: { userId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      lastStep: true,
      updatedAt: true,
      role: true,
      round: { select: { name: true } },
      drive: { select: { year: true, company: { select: { name: true } } } },
    },
  });
}

// How many visits the company made that year (for "2025 · B").
export async function visitsThatYear(companyId: string, year: number) {
  return db.drive.count({ where: { companyId, year } });
}
