"use server";

import { refresh } from "next/cache";
import { parseDomains } from "@/lib/access";
import { logAction } from "@/server/admin/audit";
import { requireSuperAdmin, roleLabel } from "@/server/admin/guard";
import { SETTING_DEFAULTS, type SettingKey } from "@/server/admin/settings";
import { db } from "@/server/db";

// A13 Admins and settings. Super admins only; every change is audited.

type Result = { error: string | null };

// "Add an admin": gives an existing account the role, or creates the
// account so the role is there on their first sign-in.
export async function addAdmin(
  emailInput: string,
  role: "ADMIN" | "SUPER_ADMIN",
): Promise<Result> {
  const me = await requireSuperAdmin();
  const email = emailInput.trim().toLowerCase();
  const domains = parseDomains(process.env.ALLOWED_EMAIL_DOMAINS);
  if (!/^[^\s@]+@[^\s@]+$/.test(email))
    return { error: "Enter an email address." };
  if (!domains.includes(email.split("@")[1])) {
    return {
      error: `Only ${domains.join(", ") || "allowed"} addresses can sign in.`,
    };
  }
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return { error: "Pick a role." };

  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name: email.split("@")[0], role },
      update: { role },
      select: { id: true, name: true },
    });
    await logAction(
      {
        adminId: me.id,
        action: "role_change",
        targetType: "user",
        targetId: user.id,
        summary: `${user.name} (${email})`,
        detail: `Added as ${roleLabel[role]}`,
      },
      tx,
    );
  });
  refresh();
  return { error: null };
}

// Change role (CDC admin <-> super admin) or Remove (back to student).
// You cannot change your own role, and one super admin always remains.
export async function setAdminRole(
  userId: string,
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN",
): Promise<Result> {
  const me = await requireSuperAdmin();
  if (userId === me.id) return { error: "You cannot change your own role." };
  const user = await db.user.findFirst({
    where: { id: userId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || user.role === role) return { error: null };
  if (user.role === "SUPER_ADMIN") {
    const supers = await db.user.count({ where: { role: "SUPER_ADMIN" } });
    if (supers <= 1) return { error: "Keep at least one super admin." };
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role } });
    await logAction(
      {
        adminId: me.id,
        action: "role_change",
        targetType: "user",
        targetId: user.id,
        summary: `${user.name} (${user.email})`,
        detail:
          role === "STUDENT"
            ? `Removed as ${roleLabel[user.role]}`
            : `${roleLabel[user.role]} to ${roleLabel[role]}`,
      },
      tx,
    );
  });
  refresh();
  return { error: null };
}

// One switch or default. Values are checked against the default's type.
export async function saveSetting(
  key: SettingKey,
  value: boolean | number | string,
): Promise<Result> {
  const me = await requireSuperAdmin();
  if (!(key in SETTING_DEFAULTS)) return { error: "Unknown setting." };
  if (typeof value !== typeof SETTING_DEFAULTS[key])
    return { error: "Check the value." };
  if (key === "pinWindowDays" && ![7, 14, 30].includes(value as number)) {
    return { error: "Pick 7, 14 or 30 days." };
  }
  if (key === "pinTries" && !["5/15", "3/30"].includes(value as string)) {
    return { error: "Pick a tries setting." };
  }
  if (
    key === "scanDailyCap" &&
    (!Number.isInteger(value) ||
      (value as number) < 1 ||
      (value as number) > 200)
  ) {
    return { error: "Enter a number from 1 to 200." };
  }
  await db.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key },
      create: { key, value, updatedById: me.id },
      update: { value, updatedById: me.id },
    });
    await logAction(
      {
        adminId: me.id,
        action: "setting_change",
        targetType: "setting",
        targetId: key,
        summary: key,
        detail: `Set to ${String(value)}`,
      },
      tx,
    );
  });
  refresh();
  return { error: null };
}
