"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { safeLink } from "@/lib/notifications";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

// Opening a notification marks it read, then goes to its page.
export async function openNotification(id: string) {
  const user = await requireUser();
  const n = await db.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true, link: true, readAt: true },
  });
  if (!n) redirect("/me/notifications");
  if (!n.readAt) {
    await db.notification.update({
      where: { id: n.id },
      data: { readAt: new Date() },
    });
  }
  // The unread count lives in the shared header, which the browser keeps
  // between pages; refresh it.
  refresh();
  redirect(safeLink(n.link) ?? "/me/notifications");
}

export async function markAllRead() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  refresh();
  redirect("/me/notifications");
}
