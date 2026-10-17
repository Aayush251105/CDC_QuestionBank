"use server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { visibleDrive } from "@/server/queries/visibility";

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
