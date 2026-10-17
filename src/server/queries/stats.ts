import "server-only";
import { cacheLife } from "next/cache";
import { db } from "@/server/db";

// Real totals for the sign-in page (CLAUDE.md 2a.4). Hidden companies and
// unverified, student-created drives are never counted.
export async function getSiteStats() {
  "use cache";
  cacheLife("hours");

  const visibleDrive = {
    verified: true,
    company: { hidden: false, verified: true },
  };
  const [companies, questions, drives] = await Promise.all([
    db.company.count({
      where: {
        hidden: false,
        verified: true,
        drives: { some: { verified: true } },
      },
    }),
    db.question.count({ where: { round: { drive: visibleDrive } } }),
    db.drive.count({
      where: { ...visibleDrive, rounds: { some: { questions: { some: {} } } } },
    }),
  ]);
  return { companies, questions, drives };
}
