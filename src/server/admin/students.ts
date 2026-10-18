import "server-only";
import { driveTitle } from "@/lib/admin";
import { db } from "@/server/db";
import { driveTitleSelect } from "./queries";

const studentSelect = {
  id: true,
  name: true,
  email: true,
  rollNo: true,
  programme: true,
  branch: true,
  gradYear: true,
  createdAt: true,
  lastSignInAt: true,
  blockedAt: true,
} as const;

// A11: find students by roll number, SNU email or name. An exact roll
// number or email opens that student; otherwise every name match is listed.
export async function findStudents(q: string) {
  const term = q.trim();
  if (!term) {
    return {
      exact: null,
      matches: await db.user.findMany({
        where: { role: "STUDENT" },
        orderBy: [
          { lastSignInAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 20,
        select: studentSelect,
      }),
    };
  }
  const exact = await db.user.findFirst({
    where: {
      role: "STUDENT",
      OR: [
        { rollNo: { equals: term, mode: "insensitive" } },
        { email: { equals: term, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (exact) return { exact: exact.id, matches: [] };
  const matches = await db.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { rollNo: { contains: term } },
      ],
    },
    orderBy: { name: "asc" },
    take: 50,
    select: studentSelect,
  });
  return { exact: matches.length === 1 ? matches[0].id : null, matches };
}

// One student with every submission they have sent (admin view: real
// statuses and shortlist checks).
export async function getStudent(id: string) {
  const student = await db.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      ...studentSelect,
      submissions: {
        where: { status: { not: "DRAFT" } },
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          enteredWithPin: true,
          verificationTag: true,
          submittedAt: true,
          createdAt: true,
          round: {
            select: {
              name: true,
              drive: {
                select: {
                  ...driveTitleSelect,
                  verified: true,
                  requirePin: true,
                },
              },
            },
          },
          rawQuestions: { select: { decision: true } },
        },
      },
    },
  });
  if (!student) return null;
  const subs = student.submissions.map((s) => ({
    id: s.id,
    status: s.status,
    viaPin: s.enteredWithPin,
    olderDrive: !s.round.drive.requirePin,
    tag: s.verificationTag,
    sent: s.submittedAt ?? s.createdAt,
    round: s.round.name,
    driveId: s.round.drive.id,
    drive: driveTitle(s.round.drive),
    request: !s.round.drive.verified,
  }));
  return {
    ...student,
    subs,
    notFound: subs.filter((s) => s.tag === "NOT_FOUND").length,
    published: student.submissions
      .flatMap((s) => s.rawQuestions)
      .filter((q) => q.decision === "APPROVED" || q.decision === "MERGED")
      .length,
  };
}
