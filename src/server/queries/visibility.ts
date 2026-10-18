import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// What students may browse: CDC-verified drives of companies that are not
// hidden. Student-created drives ("Drive not listed") and rounds ("My round
// is not listed") never show up until the CDC verifies them.
export const visibleDrive = {
  verified: true,
  company: { hidden: false, verified: true },
} satisfies Prisma.DriveWhereInput;

export const visibleRound = {
  verified: true,
  drive: visibleDrive,
} satisfies Prisma.RoundWhereInput;

// Questions a CDC admin has not unpublished (admin A09). Use it in every
// question count too.
export const liveQuestion = {
  unpublishedAt: null,
} satisfies Prisma.QuestionWhereInput;

export const visibleQuestion = {
  ...liveQuestion,
  round: visibleRound,
} satisfies Prisma.QuestionWhereInput;
