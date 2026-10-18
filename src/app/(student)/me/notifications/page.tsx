import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { istDateTime, plural, timeAgo } from "@/lib/labels";
import { kindLabel, safeLink } from "@/lib/notifications";
import { markAllRead, openNotification } from "@/server/actions/notifications";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Notifications · Placement Question Bank",
};

const SHOWN = 50;

// The list behind "Notifications (n)" in the top strip (CLAUDE.md 2a.12).
// There is no design file for it; it follows the other account pages.
export default function NotificationsPage() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9 pb-8">
          <p className="eyebrow">Your account</p>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
            Notifications
          </h1>
          <p className="text-ink-2">
            Updates on your submissions, companies you follow and messages from
            the CDC. We never send emails.
          </p>
        </div>
      </section>
      <div className="wrap max-w-245 pt-8 pb-18">
        <Suspense fallback={<SkeletonRows rows={5} />}>
          <NotificationList />
        </Suspense>
      </div>
    </>
  );
}

async function NotificationList() {
  const user = await requireUser();
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: SHOWN,
    select: {
      id: true,
      kind: true,
      message: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
  const unread = items.filter((n) => !n.readAt).length;

  if (items.length === 0) {
    return (
      <p className="border-y border-line py-7 text-ink-3">
        Nothing yet. When the CDC reviews one of your submissions, you will see
        it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">
          {unread ? `${plural(unread, "unread notification")}` : "All read"}
        </p>
        {unread > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="btn-secondary">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      <ol className="border-t-2 border-charcoal">
        {items.map((n) => {
          const link = safeLink(n.link);
          return (
            <li
              key={n.id}
              className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-line py-4 pl-4 ${
                n.readAt
                  ? "border-l-3 border-l-transparent"
                  : "border-l-3 border-l-crimson bg-grey-band"
              }`}
            >
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
                <span className="lbl">
                  {kindLabel(n.kind)}
                  {!n.readAt && <span className="sr-only"> (unread)</span>}
                </span>
                <p className={n.readAt ? "text-ink-2" : "font-bold"}>
                  {n.message || "You have a new notification."}
                </p>
                <time
                  dateTime={n.createdAt.toISOString()}
                  title={istDateTime(n.createdAt)}
                  className="text-sm text-ink-3"
                >
                  {timeAgo(n.createdAt)}
                </time>
              </div>
              {(link || !n.readAt) && (
                <form
                  action={openNotification.bind(null, n.id)}
                  className="pr-4"
                >
                  <button
                    type="submit"
                    className="min-h-11 cursor-pointer font-bold text-crimson hover:text-crimson-dark"
                  >
                    {link ? "Open" : "Mark as read"}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ol>
      {items.length === SHOWN && (
        <p className="text-sm text-ink-3">Showing the latest {SHOWN}.</p>
      )}
    </div>
  );
}
