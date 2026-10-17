"use server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { visibleDrive, visibleQuestion } from "@/server/queries/visibility";

// Follow or unfollow a company. Returns the new state.
export async function setFollowCompany(companyId: string, follow: boolean) {
  const user = await requireUser();

  if (follow) {
    const company = await db.company.findFirst({
      where: {
        id: companyId,
        hidden: false,
        verified: true,
        drives: { some: visibleDrive },
      },
      select: { id: true },
    });
    if (!company) return { following: false };
    await db.bookmark.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      create: { userId: user.id, companyId },
      update: {},
    });
    return { following: true };
  }

  await db.bookmark.deleteMany({ where: { userId: user.id, companyId } });
  return { following: false };
}

// Save or unsave a published question. Returns the new state.
export async function setSaveQuestion(questionId: string, save: boolean) {
  const user = await requireUser();

  if (save) {
    const question = await db.question.findFirst({
      where: { id: questionId, ...visibleQuestion },
      select: { id: true },
    });
    if (!question) return { saved: false };
    await db.bookmark.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId },
      update: {},
    });
    return { saved: true };
  }

  await db.bookmark.deleteMany({ where: { userId: user.id, questionId } });
  return { saved: false };
}
