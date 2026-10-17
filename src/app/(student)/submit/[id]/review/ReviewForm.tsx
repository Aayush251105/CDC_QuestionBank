"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { difficultyLabel, plural, questionTypeLabel } from "@/lib/labels";
import { countUnclear, type ReviewQuestion } from "@/lib/review";
import { saveReview, submitForReview } from "@/server/actions/review";

type Item = ReviewQuestion & {
  title: string;
  source: string;
  aiAdded: string[];
  original: string;
};

const TYPES = Object.keys(questionTypeLabel) as QuestionType[];
const DIFFICULTIES = Object.keys(difficultyLabel) as Difficulty[];

// S4: one block per question (what the student gave us beside the cleaned
// version), then the honour statement. Edits autosave.
export function ReviewForm({
  submissionId,
  alreadySent,
  driveClosed,
  initialCredit,
  initialQuestions,
}: {
  submissionId: string;
  alreadySent: boolean;
  driveClosed: boolean;
  initialCredit: boolean;
  initialQuestions: Item[];
}) {
  const [items, setItems] = useState(initialQuestions);
  const [agreed, setAgreed] = useState(false);
  const [credit, setCredit] = useState(initialCredit);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emptyIds, setEmptyIds] = useState<string[]>([]);
  const [sending, startSending] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(items);

  const toServer = (list: Item[]) =>
    list.map(({ id, type, difficulty, cleaned, options, topics }) => ({
      id,
      type,
      difficulty,
      cleaned,
      options,
      topics,
    }));

  async function persist() {
    clearTimeout(timer.current);
    setSaveState("saving");
    try {
      const r = await saveReview(submissionId, toServer(latest.current));
      setSaveState(r.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  function change(list: Item[]) {
    setItems(list);
    latest.current = list;
    setSaveState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(persist, 1500);
  }

  function edit(id: string, patch: Partial<Item>) {
    change(items.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    if (patch.cleaned) setEmptyIds((ids) => ids.filter((x) => x !== id));
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const unclear = items.reduce((n, q) => n + countUnclear(q.cleaned), 0);
  const blocked = !agreed || driveClosed || sending;
  const footText = driveClosed
    ? "This drive is closed"
    : !agreed
      ? "Tick the honour statement to submit"
      : `${plural(items.length, "question")} ready${unclear ? ` · ${unclear} [unclear] to fix` : ""}`;
  const saveText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "error"
          ? "Could not save. Check your connection."
          : "All changes saved";

  return (
    <div className="flex flex-col gap-10">
      {driveClosed && (
        <div className="flex flex-col gap-2 border-t-3 border-crimson bg-peach px-5 py-4.5">
          <strong>
            This drive is closed, so submissions are switched off.
          </strong>
          <span className="text-[15px]">
            Your draft is kept. If you think this is a mistake, contact the CDC.{" "}
            <Link href="/help" className="font-bold">
              Read the help page
            </Link>
          </span>
        </div>
      )}

      {items.map((q, i) => {
        const nn = String(i + 1).padStart(2, "0");
        const marks = countUnclear(q.cleaned);
        const showOptions =
          q.type === "MCQ" || q.type === "APTITUDE" || q.options.trim() !== "";
        return (
          <article
            key={q.id}
            aria-labelledby={`h-${q.id}`}
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-charcoal pb-2.5">
              <h2 id={`h-${q.id}`} className="text-xl font-bold">
                <span className="text-crimson">{nn}</span> · {q.title}
              </h2>
              <span className="flex flex-wrap items-baseline gap-4 text-sm text-ink-3">
                {q.source}
                {items.length > 1 &&
                  (confirmRemove === q.id ? (
                    <span className="flex items-baseline gap-3">
                      <span className="text-charcoal">
                        Remove this question?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRemove(null);
                          change(items.filter((x) => x.id !== q.id));
                        }}
                        className="min-h-11 cursor-pointer font-bold text-crimson underline"
                      >
                        Yes, remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        className="min-h-11 cursor-pointer font-bold text-charcoal underline"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(q.id)}
                      className="min-h-11 cursor-pointer font-bold text-charcoal underline"
                      aria-label={`Remove question ${nn}`}
                    >
                      Remove
                    </button>
                  ))}
              </span>
            </div>

            {marks > 0 && (
              <div
                role="alert"
                className="border-l-3 border-crimson bg-peach px-4 py-3 text-[15px]"
              >
                <strong>
                  {marks === 1
                    ? "1 part could not be read."
                    : `${marks} parts could not be read.`}
                </strong>{" "}
                Replace [unclear] in the cleaned version before submitting, if
                you remember it.
              </div>
            )}
            {q.aiAdded.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-3 border-charcoal bg-grey-band px-4 py-3 text-[15px]">
                <span className="border border-charcoal px-2 py-0.5 text-xs font-bold tracking-[0.06em] uppercase">
                  AI added
                </span>
                <span>
                  We wrote these parts ourselves:{" "}
                  <strong>{q.aiAdded.join(", ")}</strong>. Check they match the
                  test, and fix or delete them if not.
                </span>
              </p>
            )}
            {emptyIds.includes(q.id) && (
              <p role="alert" className="text-[15px] font-bold text-crimson">
                This question is empty. Write it or remove it.
              </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
              <div className="flex flex-col gap-1.5">
                <span className="lbl">What you gave us</span>
                <pre className="min-h-42 overflow-auto border border-line bg-grey-band px-3.5 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">
                  {q.original}
                </pre>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="lbl" htmlFor={`c-${q.id}`}>
                  Cleaned version · you can edit
                </label>
                <textarea
                  id={`c-${q.id}`}
                  rows={Math.min(
                    28,
                    Math.max(8, q.cleaned.split("\n").length + 1),
                  )}
                  maxLength={8000}
                  value={q.cleaned}
                  onChange={(e) => edit(q.id, { cleaned: e.target.value })}
                  onBlur={() => saveState === "dirty" && persist()}
                  aria-invalid={emptyIds.includes(q.id) || undefined}
                  className="field min-h-42 resize-y px-3.5 py-3 font-mono text-[13px] leading-relaxed"
                />
              </div>
            </div>

            {showOptions && (
              <div className="flex flex-col gap-1.5">
                <label className="lbl" htmlFor={`o-${q.id}`}>
                  Answer options · one per line
                </label>
                <textarea
                  id={`o-${q.id}`}
                  rows={Math.max(3, q.options.split("\n").length + 1)}
                  value={q.options}
                  onChange={(e) => edit(q.id, { options: e.target.value })}
                  onBlur={() => saveState === "dirty" && persist()}
                  placeholder={"A. First option\nB. Second option"}
                  className="field resize-y px-3.5 py-3 font-mono text-[13px] leading-relaxed"
                />
              </div>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="lbl" htmlFor={`t-${q.id}`}>
                  Type
                </label>
                <select
                  id={`t-${q.id}`}
                  value={q.type}
                  onChange={(e) =>
                    edit(q.id, { type: e.target.value as QuestionType })
                  }
                  className="field"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {questionTypeLabel[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="lbl" htmlFor={`d-${q.id}`}>
                  Difficulty
                </label>
                <select
                  id={`d-${q.id}`}
                  value={q.difficulty}
                  onChange={(e) =>
                    edit(q.id, { difficulty: e.target.value as Difficulty })
                  }
                  className="field"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {difficultyLabel[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="lbl" htmlFor={`p-${q.id}`}>
                  Topics we suggest
                </label>
                <input
                  id={`p-${q.id}`}
                  value={q.topics}
                  maxLength={300}
                  onChange={(e) => edit(q.id, { topics: e.target.value })}
                  onBlur={() => saveState === "dirty" && persist()}
                  placeholder="Separate topics with commas"
                  className="field"
                />
              </div>
            </div>
          </article>
        );
      })}

      <section
        aria-labelledby="conf-h"
        className="flex flex-col gap-4.5 border-t-4 border-charcoal bg-grey-band p-7"
      >
        <h2 id="conf-h" className="text-[22px] font-bold">
          Before you submit
        </h2>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 flex-none accent-crimson"
          />
          <span>
            <strong>I sat this test</strong> and these questions are from it, as
            best I remember. I have not shared them while the test window was
            open. <span className="text-crimson">(required)</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={credit}
            onChange={(e) => setCredit(e.target.checked)}
            className="mt-0.5 size-5 flex-none accent-crimson"
          />
          <span>
            <strong>Credit me by name</strong> on questions that get published.
            Leave this unticked to stay anonymous.
          </span>
        </label>
        <p className="text-sm text-ink-3">
          {alreadySent
            ? "Your changes replace what you sent before. It stays in the queue until the CDC reviews it."
            : "You can still edit or withdraw this submission until the CDC reviews it."}
        </p>
      </section>

      {error && (
        <p
          role="alert"
          className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <span
          aria-live="polite"
          className={`self-end text-sm ${saveState === "error" ? "font-bold text-crimson" : "text-ink-3"}`}
        >
          {saveText}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
          <Link
            href={
              alreadySent
                ? `/me/submissions/${submissionId}`
                : `/submit/${submissionId}/questions`
            }
            className="btn-secondary"
          >
            {alreadySent ? "Back to submission" : "Back to questions"}
          </Link>
          <span className="flex-auto text-right text-sm text-ink-3">
            {footText}
          </span>
          <button
            type="button"
            disabled={blocked}
            onClick={() =>
              startSending(async () => {
                clearTimeout(timer.current);
                setError(null);
                const r = await submitForReview(submissionId, {
                  questions: toServer(latest.current),
                  honour: agreed,
                  credit,
                });
                if (r) {
                  setError(r.message);
                  setEmptyIds(r.emptyIds ?? []);
                } else {
                  setSaveState("saved");
                }
              })
            }
            className="btn-primary"
          >
            {sending
              ? "Sending…"
              : alreadySent
                ? "Save changes"
                : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}
