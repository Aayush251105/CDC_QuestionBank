"use server";

import { refresh } from "next/cache";
import { driveTitle, parseDateInput } from "@/lib/admin";
import { formatPin } from "@/lib/pin";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { freshPin } from "@/server/admin/pin";
import { driveTitleSelect } from "@/server/admin/queries";
import { db } from "@/server/db";

// A05 Drive PIN actions. Every one is written to the audit log (A00b rules).

async function loadDrive(driveId: string) {
  return db.drive.findFirst({
    where: { id: driveId, verified: true },
    select: {
      ...driveTitleSelect,
      submissionPin: true,
      pinEnabled: true,
    },
  });
}

// Generate (no PIN yet) or Regenerate (the old PIN stops working at once;
// submissions already made keep the PIN they came in with).
export async function generateDrivePin(driveId: string) {
  const admin = await requireAdmin();
  const drive = await loadDrive(driveId);
  if (!drive) return;
  const pin = await freshPin();
  const old = drive.submissionPin;
  await db.$transaction(async (tx) => {
    await tx.drive.update({
      where: { id: drive.id },
      data: { submissionPin: pin, pinEnabled: true, pinCreatedAt: new Date() },
    });
    await logAction(
      {
        adminId: admin.id,
        action: old ? "pin_regenerate" : "pin_generate",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: driveTitle(drive),
        detail: old
          ? `${formatPin(old)} replaced by ${formatPin(pin)}`
          : `PIN ${formatPin(pin)}`,
      },
      tx,
    );
  });
  refresh();
}

// Switch off / Switch on. Off means no student can use the PIN, whatever
// the dates say.
export async function setPinEnabled(driveId: string, enabled: boolean) {
  const admin = await requireAdmin();
  const drive = await loadDrive(driveId);
  if (!drive?.submissionPin || drive.pinEnabled === enabled) return;
  await db.$transaction(async (tx) => {
    await tx.drive.update({
      where: { id: drive.id },
      data: { pinEnabled: enabled },
    });
    await logAction(
      {
        adminId: admin.id,
        action: enabled ? "pin_on" : "pin_off",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: driveTitle(drive),
      },
      tx,
    );
  });
  refresh();
}

// Copy PIN is audited as "PIN viewed" (A14).
export async function logPinCopied(driveId: string) {
  const admin = await requireAdmin();
  const drive = await loadDrive(driveId);
  if (!drive?.submissionPin) return;
  await logAction({
    adminId: admin.id,
    action: "pin_view",
    targetType: "drive",
    targetId: drive.id,
    driveId: drive.id,
    summary: driveTitle(drive),
    detail: "Copied the PIN",
  });
}

// Change dates: the submission window the PIN works in.
export async function changePinDates(
  driveId: string,
  opens: string,
  closes: string,
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const drive = await loadDrive(driveId);
  if (!drive) return { error: "This drive no longer exists." };
  const opensAt = parseDateInput(opens);
  const closesAt = parseDateInput(closes);
  if (opensAt && closesAt && closesAt < opensAt) {
    return { error: "The close date is before the open date." };
  }
  await db.$transaction(async (tx) => {
    await tx.drive.update({
      where: { id: drive.id },
      data: { opensAt, closesAt },
    });
    await logAction(
      {
        adminId: admin.id,
        action: "drive_edit",
        targetType: "drive",
        targetId: drive.id,
        driveId: drive.id,
        summary: driveTitle(drive),
        detail: `Window ${opens || "open"} to ${closes || "no end"}`,
      },
      tx,
    );
  });
  refresh();
  return { error: null };
}
