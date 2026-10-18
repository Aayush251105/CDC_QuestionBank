"use server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

// "Credit me by name by default" on the Profile page.
export async function setCreditByDefault(credit: boolean) {
  const user = await requireUser();
  const updated = await db.user.update({
    where: { id: user.id },
    data: { creditByDefault: credit },
    select: { creditByDefault: true },
  });
  return { credit: updated.creditByDefault };
}
