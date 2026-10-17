import Link from "next/link";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { difficultyLabel, questionTypeLabel } from "@/lib/labels";

// One question in a list: title and type on top, where it was asked and
// difficulty below. The whole row links to the question page.
export function QuestionRow({
  id,
  title,
  type,
  difficulty,
  where,
}: {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: Difficulty;
  where: string;
}) {
  return (
    <Link
      href={`/questions/${id}`}
      className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 border-b border-line py-4 text-charcoal no-underline hover:text-charcoal"
    >
      <span className="text-[17px] font-bold group-hover:text-crimson">
        {title}
      </span>
      <span className="self-center text-xs font-bold tracking-[0.08em] text-ink-2 uppercase">
        {questionTypeLabel[type]}
      </span>
      <span className="text-sm text-ink-3">{where}</span>
      <span className="text-right text-sm text-ink-3">
        {difficultyLabel[difficulty]}
      </span>
    </Link>
  );
}
