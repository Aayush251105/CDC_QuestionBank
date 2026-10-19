import "server-only";
import { db } from "@/server/db";

export type Pending = {
  email: string;
  name: string | null;
  rollNo: string | null;
  userId: string | null;
  hasAccount: boolean;
  reminders: number;
  lastReminded: Date | null;
};

// Students on a round's current shortlist who have not sent questions for
// that round yet (a draft does not count), with their reminder history.
// Rows without an email address cannot be reminded and are counted apart.
export async function getNotSubmitted(roundId: string) {
  const upload = await db.shortlistUpload.findFirst({
    where: { roundId },
    orderBy: { createdAt: "desc" },
    select: {
      entries: {
        orderBy: { rowNo: "asc" },
        select: {
          email: true,
          name: true,
          rollNo: true,
          matchedUser: {
            select: { id: true, email: true, name: true, rollNo: true },
          },
        },
      },
    },
  });
  if (!upload)
    return {
      hasShortlist: false,
      pending: [] as Pending[],
      noEmail: 0,
      submitted: 0,
    };

  const [sent, reminders] = await Promise.all([
    db.submission.findMany({
      where: { roundId, status: { notIn: ["DRAFT", "WITHDRAWN"] } },
      select: { userId: true, user: { select: { email: true } } },
    }),
    db.emailReminder.groupBy({
      by: ["email"],
      where: { roundId },
      _count: true,
      _max: { sentAt: true },
    }),
  ]);
  const sentUsers = new Set(sent.map((s) => s.userId));
  const sentEmails = new Set(sent.map((s) => s.user.email.toLowerCase()));

  const seen = new Set<string>();
  const pending: Pending[] = [];
  let noEmail = 0;
  let submitted = 0;
  for (const e of upload.entries) {
    const u = e.matchedUser;
    const email = (u?.email ?? e.email ?? "").trim().toLowerCase();
    if ((u && sentUsers.has(u.id)) || (email && sentEmails.has(email))) {
      submitted++;
      continue;
    }
    if (!email || !email.includes("@")) {
      noEmail++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const r = reminders.find((x) => x.email === email);
    pending.push({
      email,
      name: u?.name ?? e.name,
      rollNo: u?.rollNo ?? e.rollNo,
      userId: u?.id ?? null,
      hasAccount: Boolean(u),
      reminders: r?._count ?? 0,
      lastReminded: r?._max.sentAt ?? null,
    });
  }
  return { hasShortlist: true, pending, noEmail, submitted };
}
