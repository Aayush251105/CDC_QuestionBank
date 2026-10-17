import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

// One row in the audit log (A14). Rows are only ever added, never edited or
// deleted. Pass `tx` to write it in the same transaction as the change.
export function logAction(
  entry: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    driveId?: string | null;
    summary?: string;
    detail?: string;
    reason?: string;
  },
  tx: Prisma.TransactionClient = db,
) {
  return tx.reviewAction.create({ data: entry });
}
