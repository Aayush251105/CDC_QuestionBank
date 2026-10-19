"use server";

import { redirect } from "next/navigation";
import { driveTitle } from "@/lib/admin";
import { matchRow, type ShortlistRow } from "@/lib/shortlist";
import { logAction } from "@/server/admin/audit";
import { requireAdmin } from "@/server/admin/guard";
import { driveTitleSelect } from "@/server/admin/queries";
import { loadAccounts, recheckRound } from "@/server/admin/shortlist";
import { db } from "@/server/db";

const MAX_ROWS = 5000;

// Keep only the three fields we use, trimmed and short.
function cleanRows(rows: ShortlistRow[]): ShortlistRow[] {
  const cut = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined;
  return rows.slice(0, MAX_ROWS).map((r, i) => ({
    rowNo: Number.isInteger(r.rowNo) ? r.rowNo : i + 1,
    rollNo: cut(r.rollNo),
    email: cut(r.email),
    name: cut(r.name),
  }));
}

export type ShortlistPreview = {
  total: number;
  matched: number; // roll number or SNU email
  nameOnly: number;
  none: number;
  issues: {
    rowNo: number;
    rollNo: string | null;
    name: string | null;
    email: string | null;
    result: "NAME" | "NONE";
    note: string;
  }[];
};

// A06 step 3 "Check before importing". Only rows that need a look are listed.
export async function previewShortlist(
  input: ShortlistRow[],
): Promise<ShortlistPreview> {
  await requireAdmin();
  const rows = cleanRows(input);
  const accounts = await loadAccounts();
  const preview: ShortlistPreview = {
    total: rows.length,
    matched: 0,
    nameOnly: 0,
    none: 0,
    issues: [],
  };
  for (const row of rows) {
    const m = matchRow(row, accounts);
    const base = {
      rowNo: row.rowNo,
      rollNo: row.rollNo ?? null,
      name: row.name ?? null,
      email: row.email ?? null,
    };
    if (m.match === "ROLL_NO" || m.match === "EMAIL") {
      preview.matched++;
    } else if (m.match === "NAME") {
      preview.nameOnly++;
      preview.issues.push({
        ...base,
        result: "NAME",
        note: `Matched ${m.user!.name}${m.user!.rollNo ? `, ${m.user!.rollNo}` : ` (${m.user!.email})`}. Confirm in review.`,
      });
    } else {
      preview.none++;
      preview.issues.push({
        ...base,
        result: "NONE",
        note: m.ambiguous
          ? "Several students have this name; add a roll number or email."
          : row.rollNo
            ? "No SNU account has signed in with this roll number yet."
            : row.email
              ? "No SNU account has signed in with this email yet."
              : "No SNU account with this name yet.",
      });
    }
  }
  return preview;
}

// Saves the rows as the round's new shortlist (older uploads stay for
// "Earlier uploads"), then re-checks the round's submissions.
export async function importShortlist(
  driveId: string,
  roundId: string,
  fileName: string,
  input: ShortlistRow[],
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const round = await db.round.findFirst({
    where: { id: roundId, driveId, drive: { verified: true } },
    select: {
      id: true,
      order: true,
      drive: { select: driveTitleSelect },
    },
  });
  if (!round) return { error: "Pick a round of this drive." };
  const rows = cleanRows(input).filter((r) => r.rollNo || r.email || r.name);
  if (rows.length === 0) {
    return { error: "No rows with a roll number, email or name to import." };
  }

  const accounts = await loadAccounts();
  const matched = rows.map((r) => ({ row: r, ...matchRow(r, accounts) }));
  const unmatched = matched.filter((m) => m.match === "NONE").length;
  const name = fileName.slice(0, 200) || "shortlist.csv";

  await db.$transaction(
    async (tx) => {
      const upload = await tx.shortlistUpload.create({
        data: { roundId: round.id, fileName: name, uploadedById: admin.id },
      });
      await tx.shortlistEntry.createMany({
        data: matched.map((m) => ({
          uploadId: upload.id,
          roundId: round.id,
          rowNo: m.row.rowNo,
          rollNo: m.row.rollNo ?? null,
          email: m.row.email ?? null,
          name: m.row.name ?? null,
          matchedUserId: m.user?.id ?? null,
          match: m.match,
        })),
      });
      const rechecked = await recheckRound(tx, round.id);
      await logAction(
        {
          adminId: admin.id,
          action: "shortlist_upload",
          targetType: "round",
          targetId: round.id,
          driveId,
          summary: `${driveTitle(round.drive)} · round ${round.order}`,
          detail: `${rows.length} rows, ${unmatched} unmatched; ${rechecked} submission(s) re-checked`,
        },
        tx,
      );
    },
    { timeout: 30_000 },
  );

  redirect(`/admin/drives/${driveId}`);
}
