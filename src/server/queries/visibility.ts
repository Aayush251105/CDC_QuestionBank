import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// What students may browse: CDC-verified drives of companies that are not
// hidden. Student-created ("Drive not listed") drives never show up.
export const visibleDrive = {
  verified: true,
  company: { hidden: false, verified: true },
} satisfies Prisma.DriveWhereInput;

// Questions a CDC admin has not unpublished (admin A09). Use it in every
// question count too.
export const liveQuestion = {
  unpublishedAt: null,
} satisfies Prisma.QuestionWhereInput;

export const visibleQuestion = {
  ...liveQuestion,
  round: { drive: visibleDrive },
} satisfies Prisma.QuestionWhereInput;
