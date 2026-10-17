import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// What students may browse: CDC-verified drives of companies that are not
// hidden. Student-created ("Drive not listed") drives never show up.
export const visibleDrive = {
  verified: true,
  company: { hidden: false, verified: true },
} satisfies Prisma.DriveWhereInput;

export const visibleQuestion = {
  round: { drive: visibleDrive },
} satisfies Prisma.QuestionWhereInput;
