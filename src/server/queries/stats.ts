import "server-only";
import { cacheLife } from "next/cache";
import { db } from "@/server/db";
import { liveQuestion, visibleDrive, visibleQuestion } from "./visibility";

// Real totals for the sign-in page (CLAUDE.md 2a.4). Hidden companies and
// unverified, student-created drives are never counted. Only numbers, so
// safe to show before sign-in.
export async function getSiteStats() {
  "use cache";
  cacheLife("hours");

  const [companies, questions, drives] = await Promise.all([
    db.company.count({
      where: {
        hidden: false,
        verified: true,
        drives: { some: { verified: true } },
      },
    }),
    db.question.count({ where: visibleQuestion }),
    db.drive.count({
      where: {
        ...visibleDrive,
        rounds: { some: { questions: { some: liveQuestion } } },
      },
    }),
  ]);
  return { companies, questions, drives };
}
