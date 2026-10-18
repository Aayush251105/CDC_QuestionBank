"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { driveLabel, roundIsFor } from "@/lib/drives";
import { roundTypeLabel } from "@/lib/labels";
import { isPinFormat, normalisePin, pinOpensDrive } from "@/lib/pin";
import { slugify } from "@/lib/slug";
import { parseRoundDetails, parseUnlistedDrive, stepHref } from "@/lib/submit";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";

// One neutral message for every bad PIN (CLAUDE.md section 7): never say
// whether it was wrong, switched off or for a closed drive.
const BAD_PIN =
  "This PIN is not valid for an open drive. Check it with the CDC.";
const TOO_MANY = "Too many tries. Wait 15 minutes, then try again.";
const PIN_LIMIT = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;
const UNLISTED_PER_DAY = 3;

export type PinState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      pin: string;
      company: string;
      drive: string;
      roles: string[];
    };

async function findDriveForPin(userId: string, input: string) {
  const pin = normalisePin(input);
  const since = new Date(Date.now() - PIN_WINDOW_MS);
  const failures = await db.pinAttempt.count({
    where: { userId, success: false, createdAt: { gte: since } },
  });
  if (failures >= PIN_LIMIT) return { error: TOO_MANY } as const;

  const drive = isPinFormat(pin)
    ? await db.drive.findUnique({
        where: { submissionPin: pin },
        select: {
          id: true,
          year: true,
          sequence: true,
          roles: true,
          status: true,
          pinEnabled: true,
          submissionPin: true,
          verified: true,
          companyId: true,
          company: { select: { name: true, hidden: true } },
        },
      })
    : null;
  const ok = Boolean(
    drive && pinOpensDrive(drive) && drive.verified && !drive.company.hidden,
  );

  // Every try is logged for the admin side; failures count towards the limit.
  await db.pinAttempt.create({
    data: {
      userId,
      pinTried: pin.slice(0, 12),
      success: ok,
      driveId: ok ? drive!.id : null,
    },
  });
  if (!ok)
    return { error: failures + 1 >= PIN_LIMIT ? TOO_MANY : BAD_PIN } as const;
  return { drive: drive!, pin } as const;
}

// S1, step 1: check the PIN and show which drive it opens.
export async function checkPin(
  _prev: PinState,
  form: FormData,
): Promise<PinState> {
  const user = await requireUser();
  const found = await findDriveForPin(user.id, String(form.get("pin") ?? ""));
  if ("error" in found) return { status: "error", message: found.error! };
  const { drive, pin } = found;
  const visits = await db.drive.count({
    where: { companyId: drive.companyId, year: drive.year },
  });
  return {
    status: "ok",
    pin,
    company: drive.company.name,
    drive: driveLabel(drive.year, drive.sequence, visits),
    roles: drive.roles,
  };
}

// S1, step 2: role chosen. The PIN is checked again on the server.
export async function startFromPin(
  _prev: PinState,
  form: FormData,
): Promise<PinState> {
  const user = await requireUser();
  const found = await findDriveForPin(user.id, String(form.get("pin") ?? ""));
  if ("error" in found) return { status: "error", message: found.error! };
  const { drive } = found;

  const role = String(form.get("role") ?? "");
  if (drive.roles.length > 0 && !drive.roles.includes(role)) {
    return {
      status: "error",
      message: "Choose the role you sat the test for.",
    };
  }

  // Reuse an open draft for the same drive and role instead of making another.
  const existing = await db.submission.findFirst({
    where: {
      userId: user.id,
      driveId: drive.id,
      role: role || null,
      status: "DRAFT",
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, lastStep: true },
  });
  const id =
    existing?.id ??
    (
      await db.submission.create({
        data: {
          userId: user.id,
          driveId: drive.id,
          role: role || null,
          enteredWithPin: true,
          lastStep: "round",
        },
        select: { id: true },
      })
    ).id;
  redirect(
    existing ? stepHref(existing.id, existing.lastStep) : `/submit/${id}/round`,
  );
}

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
  existingHref?: string;
};

// S1: "My drive is not listed". Creates an unverified drive the CDC sorts out later.
export async function startUnlisted(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseUnlistedDrive(form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { company: companyName, year, role, testDate } = parsed.data;

  const recent = await db.drive.count({
    where: {
      createdById: user.id,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent >= UNLISTED_PER_DAY) {
    return {
      message:
        "You have added several drives today. Ask the CDC to add this one.",
    };
  }

  // Use the company if it exists (any spelling of its name), else add it unverified.
  let company = await db.company.findFirst({
    where: {
      OR: [
        { name: { equals: companyName, mode: "insensitive" } },
        { aliases: { has: companyName } },
      ],
    },
    select: { id: true },
  });
  if (!company) {
    const base = slugify(companyName) || "company";
    const taken = await db.company.count({ where: { slug: base } });
    company = await db.company.create({
      data: {
        name: companyName,
        slug: taken ? `${base}-${randomBytes(3).toString("hex")}` : base,
        verified: false,
      },
      select: { id: true },
    });
  }

  // A new, unverified visit for that company and year.
  let driveId: string | null = null;
  for (let attempt = 0; attempt < 3 && !driveId; attempt++) {
    const last = await db.drive.aggregate({
      where: { companyId: company.id, year },
      _max: { sequence: true },
    });
    try {
      driveId = (
        await db.drive.create({
          data: {
            companyId: company.id,
            year,
            sequence: (last._max.sequence ?? 0) + 1,
            roles: [role],
            status: "OPEN",
            verified: false,
            createdById: user.id,
          },
          select: { id: true },
        })
      ).id;
    } catch (e) {
      if (!(
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
      ))
        throw e;
    }
  }
  if (!driveId) return { message: "Could not save. Please try again." };

  const submission = await db.submission.create({
    data: {
      userId: user.id,
      driveId,
      role,
      enteredWithPin: false,
      testDate,
      lastStep: "round",
    },
    select: { id: true },
  });
  redirect(`/submit/${submission.id}/round`);
}

// S2: save round details and go on to typing or uploading questions.
export async function saveRoundDetails(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = String(form.get("submissionId") ?? "");
  const submission = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      role: true,
      roundId: true,
      round: { select: { verified: true, createdById: true } },
      drive: {
        select: { id: true, status: true, verified: true, roles: true },
      },
    },
  });
  if (!submission) return { message: "This draft could not be found." };
  if (submission.status !== "DRAFT") {
    return {
      message: "This submission has been sent. Edit it from My submissions.",
    };
  }
  if (submission.drive.verified && submission.drive.status === "CLOSED") {
    return {
      message: "This drive is closed, so submissions are switched off.",
    };
  }

  const parsed = parseRoundDetails(form);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  let roundId: string;
  if (d.round.kind === "existing") {
    const round = await db.round.findFirst({
      where: {
        id: d.round.id,
        driveId: submission.drive.id,
        OR: [{ verified: true }, { createdById: user.id }],
      },
      select: { id: true, roles: true },
    });
    if (!round || !roundIsFor(round, submission.role)) {
      return { errors: { round: "Choose one of the rounds listed." } };
    }
    roundId = round.id;
  } else {
    // Reuse the round this student already added for this draft, if any.
    const name = roundTypeLabel[d.round.type];
    const own =
      submission.round &&
      !submission.round.verified &&
      submission.round.createdById === user.id
        ? submission.roundId
        : null;
    if (own) {
      await db.round.update({
        where: { id: own },
        data: { type: d.round.type, name, date: d.testDate },
      });
      roundId = own;
    } else {
      const last = await db.round.aggregate({
        where: { driveId: submission.drive.id },
        _max: { order: true },
      });
      roundId = (
        await db.round.create({
          data: {
            driveId: submission.drive.id,
            order: (last._max.order ?? 0) + 1,
            slug: `${slugify(name)}-${randomBytes(3).toString("hex")}`,
            name,
            type: d.round.type,
            date: d.testDate,
            roles: submission.role ? [submission.role] : [],
            verified: false,
            createdById: user.id,
          },
          select: { id: true },
        })
      ).id;
    }
  }

  // One submission per round: if this student already has one, go there.
  const clash = await db.submission.findFirst({
    where: { userId: user.id, roundId, id: { not: submission.id } },
    select: { id: true, status: true, lastStep: true },
  });
  if (clash) {
    return {
      message: "You already have a submission for this round.",
      existingHref:
        clash.status === "DRAFT"
          ? stepHref(clash.id, clash.lastStep)
          : `/me/submissions/${clash.id}`,
    };
  }

  await db.submission.update({
    where: { id: submission.id },
    data: {
      roundId,
      testDate: d.testDate,
      platform: d.platform,
      durationMin: d.durationMin,
      sections: d.sections,
      notes: d.notes,
      lastStep: "questions",
    },
  });
  redirect(`/submit/${submission.id}/questions`);
}
