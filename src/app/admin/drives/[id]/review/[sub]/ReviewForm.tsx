"use client";

import { useState, useTransition } from "react";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { saveReview } from "@/server/admin/actions/review";

type Choice = "APPROVE" | "MERGE" | "REJECT";

export type ReviewQuestion = {
  id: string;
  order: number;
  title: string;
  note: string;
  original: string;
  cleaned: string;
  type: QuestionType;
  difficulty: Difficulty;
  topics: string;
  suggestedMerge: string | null;
};

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "CODING", label: "Coding" },
  { value: "MCQ", label: "MCQ" },
  { value: "APTITUDE", label: "Aptitude" },
  { value: "SQL", label: "SQL" },
  { value: "WRITTEN", label: "Written" },
];
const LEVELS: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];
const REASONS = [
  "Too vague to be useful",
  "Not from this test",
  "Duplicate",
  "Inappropriate content",
  "Other",
];

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const pad = (n: number) => String(n).padStart(2, "0");

type State = {
  choice: Choice;
  title: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  topics: string;
  mergeInto: string;
  reason: string;
};

// A08: a decision for every question, then save. Reject reasons stay
// inside the CDC; the student only ever sees "Reviewed".
export function ReviewForm({
  driveId,
  submissionId,
  questions,
  candidates,
  tags,
}: {
  driveId: string;
  submissionId: string;
  questions: ReviewQuestion[];
  candidates: { id: string; label: string }[];
  tags: string[];
}) {
  const [state, setState] = useState<Record<string, State>>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        {
          choice: q.suggestedMerge ? "MERGE" : "APPROVE",
          title: q.title,
          text: q.cleaned,
          type: q.type,
          difficulty: q.difficulty,
          topics: q.topics,
          mergeInto: q.suggestedMerge ?? candidates[0]?.id ?? "",
          reason: REASONS[0],
        },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (id: string, patch: Partial<State>) => {
    setSaved(false);
    setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  };
  const count = (c: Choice) =>
    Object.values(state).filter((s) => s.choice === c).length;

  function save(goNext: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await saveReview(
        driveId,
        submissionId,
        questions.map((q) => {
          const s = state[q.id];
          return {
            rawId: q.id,
            decision: s.choice,
            mergeInto: s.choice === "MERGE" ? s.mergeInto : undefined,
            reason: s.choice === "REJECT" ? s.reason : undefined,
            title: s.title,
            text: s.text,
            type: s.type,
            difficulty: s.difficulty,
            topics: s.topics
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          };
        }),
        goNext,
      );
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
      <datalist id="topic-list">
        {tags.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {questions.map((q) => {
        const s = state[q.id];
        return (
          <article key={q.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-charcoal pb-2">
              <h2 className="text-lg font-bold">
                <span className="text-crimson">{pad(q.order)}</span> · {q.title}
              </h2>
              {q.note && (
                <span className="text-[13px] text-ink-3">{q.note}</span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="lbl">Student&apos;s original</span>
                <div className="min-h-35 border border-line bg-grey-band px-3.5 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                  {q.original}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="lbl" htmlFor={`txt-${q.id}`}>
                  Cleaned version · edit before approving
                </label>
                <textarea
                  id={`txt-${q.id}`}
                  rows={6}
                  value={s.text}
                  disabled={s.choice !== "APPROVE"}
                  onChange={(e) => set(q.id, { text: e.target.value })}
                  className="min-h-35 w-full resize-y border border-line-strong bg-white px-3.5 py-3 font-mono text-[13px] leading-relaxed focus:border-charcoal focus:outline-none disabled:bg-grey-band disabled:text-ink-3"
                />
              </div>
            </div>
            {s.choice === "APPROVE" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-[2_1_220px] flex-col gap-1">
                  <label className="lbl" htmlFor={`title-${q.id}`}>
                    Title
                  </label>
                  <input
                    id={`title-${q.id}`}
                    value={s.title}
                    onChange={(e) => set(q.id, { title: e.target.value })}
                    className={field}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="lbl" htmlFor={`type-${q.id}`}>
                    Type
                  </label>
                  <select
                    id={`type-${q.id}`}
                    value={s.type}
                    onChange={(e) =>
                      set(q.id, { type: e.target.value as QuestionType })
                    }
                    className={`${field} w-37.5`}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="lbl" htmlFor={`diff-${q.id}`}>
                    Difficulty
                  </label>
                  <select
                    id={`diff-${q.id}`}
                    value={s.difficulty}
                    onChange={(e) =>
                      set(q.id, { difficulty: e.target.value as Difficulty })
                    }
                    className={`${field} w-32.5`}
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-[1_1_200px] flex-col gap-1">
                  <label className="lbl" htmlFor={`tags-${q.id}`}>
                    Topics
                  </label>
                  <input
                    id={`tags-${q.id}`}
                    list="topic-list"
                    value={s.topics}
                    placeholder="Binary search, Greedy"
                    onChange={(e) => set(q.id, { topics: e.target.value })}
                    className={field}
                  />
                </div>
              </div>
            )}
            <div
              role="radiogroup"
              aria-label={`Decision for question ${pad(q.order)}`}
              className="flex flex-wrap self-start border border-charcoal"
            >
              {(["APPROVE", "MERGE", "REJECT"] as Choice[]).map((c) => {
                const on = s.choice === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={c === "MERGE" && candidates.length === 0}
                    onClick={() => set(q.id, { choice: c })}
                    className={`min-h-11 border-r border-charcoal px-5 text-sm font-bold last:border-r-0 disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? c === "REJECT"
                          ? "bg-charcoal text-white"
                          : "bg-crimson text-white"
                        : "bg-white text-charcoal"
                    }`}
                  >
                    {c === "APPROVE"
                      ? "Approve"
                      : c === "MERGE"
                        ? "Merge"
                        : "Reject"}
                  </button>
                );
              })}
            </div>
            {s.choice === "MERGE" && (
              <div className="flex flex-col gap-1.5 bg-grey-band px-4 py-3.5 text-sm">
                <label className="lbl" htmlFor={`merge-${q.id}`}>
                  Merge into
                </label>
                <select
                  id={`merge-${q.id}`}
                  value={s.mergeInto}
                  onChange={(e) => set(q.id, { mergeInto: e.target.value })}
                  className={field}
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span className="text-[13px] text-ink-3">
                  This student is added to its contributors. The wording of the
                  published question is kept.
                </span>
              </div>
            )}
            {s.choice === "REJECT" && (
              <div className="flex flex-col gap-1.5 bg-grey-band px-4 py-3.5 text-sm">
                <label className="lbl" htmlFor={`reason-${q.id}`}>
                  Reason, for the CDC only
                </label>
                <select
                  id={`reason-${q.id}`}
                  value={s.reason}
                  onChange={(e) => set(q.id, { reason: e.target.value })}
                  className={field}
                >
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}
          </article>
        );
      })}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal bg-white pt-5 pb-3">
        <span className="text-sm text-ink-3">
          {count("APPROVE")} to approve · {count("MERGE")} to merge ·{" "}
          {count("REJECT")} to reject
        </span>
        {error && (
          <span role="alert" className="font-bold text-crimson">
            {error}
          </span>
        )}
        {saved && !error && (
          <span role="status" className="font-bold">
            Saved
          </span>
        )}
        <span className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => save(false)}
          >
            Save and stay
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => save(true)}
          >
            {pending ? "Saving…" : "Save and go to next"}
          </button>
        </span>
      </div>
    </div>
  );
}
