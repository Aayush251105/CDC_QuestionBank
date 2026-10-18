import "server-only";
import { db } from "@/server/db";

// Super admin defaults and switches (A13), kept in the Setting table. A
// missing row means the default below.
export const SETTING_DEFAULTS = {
  requirePinDefault: true, // New drive form starts with "Require a PIN" on
  pinWindowDays: 14, // PIN works this many days after the last round
  pinTries: "5/15", // wrong tries before a pause / pause in minutes
  aiCleanup: true, // used by the AI module when it is built
  scanUploads: true, // used by S3b when it is built
  scanDailyCap: 20, // scan pages per student per day
};

export type Settings = typeof SETTING_DEFAULTS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const settings = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (!(row.key in settings)) continue;
    const key = row.key as SettingKey;
    if (typeof row.value === typeof SETTING_DEFAULTS[key]) {
      (settings as Record<SettingKey, unknown>)[key] = row.value;
    }
  }
  return settings;
}

// Admins and super admins, with when each last did something in the admin
// portal (from the audit log).
export async function getAdmins() {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: [{ role: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });
  const last = await db.reviewAction.groupBy({
    by: ["adminId"],
    where: { adminId: { in: admins.map((a) => a.id) } },
    _max: { createdAt: true },
  });
  return admins.map((a) => ({
    ...a,
    lastActive: last.find((l) => l.adminId === a.id)?._max.createdAt ?? null,
  }));
}
