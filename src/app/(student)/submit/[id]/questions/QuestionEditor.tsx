"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import { questionTypeLabel } from "@/lib/labels";
import {
  emptyFields,
  isComplete,
  QUESTION_TYPES,
  type QuestionFields,
  questionTitle,
} from "@/lib/questionForm";
import {
  deleteQuestion,
  finishQuestions,
  saveQuestion,
} from "@/server/actions/questions";

export type EditorQuestion = {
  key: string; // stable on the page, even before the first save
  id: string | null; // database id once saved
  type: QuestionType;
  section: string;
  difficultyFelt: Difficulty | null;
  notes: string;
  fields: QuestionFields;
  fromScan: string | null; // text read from an upload (not editable here)
};

let nextKey = 0;
export const blankQuestion = (): EditorQuestion => ({
  key: `new-${nextKey++}`,
  id: null,
  type: "CODING",
  section: "",
  difficultyFelt: null,
  notes: "",
  fields: emptyFields(),
  fromScan: null,
});

type SaveState = "saved" | "saving" | "dirty" | { error: string };

// S3a. The question list on the left, the editor for one question on the
// right. Each change autosaves about a second after typing stops; switching
// question, adding one or continuing saves first.
export function QuestionEditor({
  submissionId,
  sections,
  initial,
  startKey,
}: {
  submissionId: string;
  sections: string[];
  initial: EditorQuestion[];
  startKey: string | null;
}) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    initial.length ? initial : [blankQuestion()],
  );
  const [currentKey, setCurrentKey] = useState(
    startKey && initial.some((q) => q.key === startKey)
      ? startKey
      : (initial[0]?.key ?? questions[0].key),
  );
  const [save, setSave] = useState<SaveState>("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();

  const current = questions.find((q) => q.key === currentKey) ?? questions[0];
  const latest = useRef(questions);
  // Saves run after a delay or a click, so the effect has always caught up.
  useEffect(() => {
    latest.current = questions;
  }, [questions]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef<Promise<void>>(Promise.resolve());
  const dirtyKeys = useRef(new Set<string>());

  // Saves one question; saves never overlap, so a new question is created once.
  const saveNow = useCallback(
    (key: string) => {
      inFlight.current = inFlight.current.then(async () => {
        if (!dirtyKeys.current.has(key)) return;
        dirtyKeys.current.delete(key);
        const q = latest.current.find((x) => x.key === key);
        if (!q || q.fromScan) return;
        setSave("saving");
        try {
          const result = await saveQuestion(submissionId, q.id, {
            type: q.type,
            section: q.section,
            difficultyFelt: q.difficultyFelt,
            notes: q.notes,
            fields: q.fields,
          });
          if (!result.ok) return setSave({ error: result.message });
          if (!q.id) {
            setQuestions((all) =>
              all.map((x) => (x.key === key ? { ...x, id: result.id } : x)),
            );
          }
          setSave(dirtyKeys.current.size ? "dirty" : "saved");
        } catch {
          dirtyKeys.current.add(key);
          setSave({
            error: "Could not save. Check your connection; we will try again.",
          });
        }
      });
      return inFlight.current;
    },
    [submissionId],
  );

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    for (const key of [...dirtyKeys.current]) await saveNow(key);
    await inFlight.current;
  }, [saveNow]);

  function update(
    change: Partial<EditorQuestion> | ((q: EditorQuestion) => EditorQuestion),
  ) {
    setQuestions((all) =>
      all.map((q) =>
        q.key === current.key
          ? typeof change === "function"
            ? change(q)
            : { ...q, ...change }
          : q,
      ),
    );
    dirtyKeys.current.add(current.key);
    setSave("dirty");
    clearTimeout(timer.current);
    const key = current.key;
    timer.current = setTimeout(() => saveNow(key), 1000);
  }
  const setField = (name: keyof QuestionFields, value: string) =>
    update((q) => ({ ...q, fields: { ...q.fields, [name]: value } }));

  // Keep the open question in the URL so a reload or Back returns to it.
  useEffect(() => {
    if (current.id) window.history.replaceState(null, "", `?q=${current.id}`);
  }, [current.id]);

  // Warn before leaving with unsaved typing.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyKeys.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function open(key: string) {
    await flush();
    setConfirmDelete(false);
    setCurrentKey(key);
  }

  async function addQuestion() {
    await flush();
    const q = blankQuestion();
    // Keep the section of the question before, it is usually the same.
    q.section = current.section;
    setQuestions((all) => [...all, q]);
    setConfirmDelete(false);
    setCurrentKey(q.key);
  }

  async function remove() {
    clearTimeout(timer.current);
    dirtyKeys.current.delete(current.key);
    await inFlight.current;
    if (current.id) await deleteQuestion(submissionId, current.id);
    const rest = questions.filter((q) => q.key !== current.key);
    const next = rest.length ? rest : [blankQuestion()];
    setQuestions(next);
    setCurrentKey(
      next[Math.max(0, questions.indexOf(current) - 1)]?.key ?? next[0].key,
    );
    setConfirmDelete(false);
    setSave("saved");
  }

  const number = questions.indexOf(current) + 1;
  const saved = questions.filter((q) => q.id || q.fromScan).length;
  const status =
    typeof save === "object"
      ? save.error
      : save === "saving"
        ? "Saving…"
        : save === "dirty"
          ? "Unsaved changes"
          : `${saved} ${saved === 1 ? "question" : "questions"} · draft saved`;

  return (
    <div className="flex flex-wrap gap-10">
      <aside
        aria-label="Your questions"
        className="flex flex-[1_1_240px] flex-col gap-3"
      >
        <div className="flex items-baseline justify-between border-b-2 border-charcoal pb-2.5">
          <h2 className="text-lg font-bold">Your questions</h2>
          <span className="text-sm text-ink-3">{questions.length}</span>
        </div>
        <ol className="-mt-3 flex flex-col">
          {questions.map((q, i) => {
            const on = q.key === current.key;
            const done = q.fromScan ? true : isComplete(q);
            return (
              <li key={q.key}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => open(q.key)}
                  className={`grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-b border-l-3 border-b-line px-3 py-3.5 text-left ${
                    on
                      ? "border-l-crimson bg-grey-band"
                      : "border-l-transparent bg-white hover:bg-grey-band"
                  }`}
                >
                  <span
                    className={`font-bold ${on ? "text-crimson" : done ? "text-published-fg" : "text-ink-3"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate text-[15px]">
                      {q.fromScan ? firstLine(q.fromScan) : questionTitle(q)}
                    </strong>
                    <span className="text-sm text-ink-3">
                      {questionTypeLabel[q.type]} ·{" "}
                      {on
                        ? "editing"
                        : q.fromScan
                          ? "from your upload"
                          : done
                            ? "complete"
                            : "not finished"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={addQuestion}
          className="btn-secondary justify-start"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="square"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add question
        </button>
        <Link
          href={`/submit/${submissionId}/upload`}
          className="text-[15px] font-bold"
        >
          Upload photos instead
        </Link>
      </aside>

      <section
        aria-labelledby="ed-h"
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-charcoal pb-2.5">
          <h2 id="ed-h" className="text-[22px] font-bold">
            Question {number}
          </h2>
          {confirmDelete ? (
            <span className="flex items-center gap-3 text-sm">
              Delete this question?
              <button
                type="button"
                onClick={remove}
                className="min-h-10 cursor-pointer font-bold text-crimson underline"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-10 cursor-pointer font-bold underline"
              >
                Keep it
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="min-h-10 cursor-pointer text-sm font-bold text-ink-3 underline hover:text-charcoal"
            >
              Delete this question
            </button>
          )}
        </div>

        {current.fromScan ? (
          <div className="flex flex-col gap-2">
            <p className="text-[15px] text-ink-2">
              This question was read from your upload. You can correct it on the
              review step.
            </p>
            <pre className="overflow-x-auto border-l-3 border-charcoal bg-grey-band px-4.5 py-4 font-mono text-[13px] whitespace-pre-wrap">
              {current.fromScan}
            </pre>
          </div>
        ) : (
          <QuestionFieldsForm
            key={current.key}
            q={current}
            sections={sections}
            onType={(type) => update({ type })}
            onSection={(section) => update({ section })}
            onDifficulty={(difficultyFelt) => update({ difficultyFelt })}
            onNotes={(notes) => update({ notes })}
            onField={setField}
            onOptions={(options) =>
              update((q) => ({ ...q, fields: { ...q.fields, options } }))
            }
            onCorrect={(correct) => setField("correct", correct)}
          />
        )}

        <button
          type="button"
          onClick={addQuestion}
          className="btn-secondary self-start"
        >
          Save and add another question
        </button>

        {finishError && (
          <p
            role="alert"
            className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
          >
            {finishError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
          <Link
            href={`/submit/${submissionId}/round`}
            className="btn-secondary"
          >
            Back
          </Link>
          <span
            aria-live="polite"
            className={`flex-auto text-right text-sm ${typeof save === "object" ? "font-bold text-crimson" : "text-ink-3"}`}
          >
            {status}
          </span>
          <button
            type="button"
            disabled={finishing}
            onClick={() =>
              startFinish(async () => {
                setFinishError(null);
                await flush();
                const r = await finishQuestions(submissionId);
                if (r?.message) setFinishError(r.message);
              })
            }
            className="btn-primary disabled:opacity-60"
          >
            {finishing ? "Saving…" : "Continue to review"}
          </button>
        </div>
      </section>
    </div>
  );
}

function firstLine(text: string) {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 60
    ? `${line.slice(0, 57)}…`
    : line || "Question from your upload";
}

// The fields for one question, per type.
function QuestionFieldsForm({
  q,
  sections,
  onType,
  onSection,
  onDifficulty,
  onNotes,
  onField,
  onOptions,
  onCorrect,
}: {
  q: EditorQuestion;
  sections: string[];
  onType: (t: QuestionType) => void;
  onSection: (s: string) => void;
  onDifficulty: (d: Difficulty | null) => void;
  onNotes: (n: string) => void;
  onField: (name: keyof QuestionFields, value: string) => void;
  onOptions: (options: string[]) => void;
  onCorrect: (key: string) => void;
}) {
  const f = q.fields;
  const text = (name: keyof QuestionFields) => ({
    value: f[name] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onField(name, e.target.value),
  });
  const keys = ["A", "B", "C", "D", "E", "F"];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="lbl" id="qt-l">
          Question type
        </span>
        <div
          role="radiogroup"
          aria-labelledby="qt-l"
          className="flex flex-wrap pl-px"
        >
          {QUESTION_TYPES.map((t) => (
            <label
              key={t}
              className="-ml-px flex min-h-11.5 cursor-pointer items-center border border-line-strong bg-white px-4 text-[15px] font-medium has-checked:relative has-checked:border-charcoal has-checked:bg-charcoal has-checked:font-bold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-charcoal"
            >
              <input
                type="radio"
                name="qtype"
                value={t}
                checked={q.type === t}
                onChange={() => onType(t)}
                className="sr-only"
              />
              {questionTypeLabel[t]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
        {sections.length > 0 && (
          <Field id="sec" label="Section">
            <select
              id="sec"
              value={q.section}
              onChange={(e) => onSection(e.target.value)}
              className="field min-h-12 text-base"
            >
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="df" label="How hard did it feel?">
          <select
            id="df"
            value={q.difficultyFelt ?? ""}
            onChange={(e) =>
              onDifficulty((e.target.value || null) as Difficulty | null)
            }
            className="field min-h-12 text-base"
          >
            <option value="">Not sure</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </Field>
      </div>

      <Field id="t" label="Short title" optional>
        <input
          id="t"
          maxLength={120}
          className="field min-h-12 text-base"
          {...text("title")}
        />
      </Field>

      {q.type === "CODING" && (
        <>
          <Field
            id="c-b"
            label="Problem statement"
            hint="Write it the way you remember. Rough wording is fine; we tidy it on the next step."
          >
            <textarea
              id="c-b"
              rows={5}
              className={area}
              {...text("statement")}
            />
          </Field>
          <Field id="c-c" label="Constraints" optional="if you remember">
            <textarea
              id="c-c"
              rows={2}
              className={`${area} font-mono text-sm`}
              {...text("constraints")}
            />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Field id="c-i" label="Sample input">
              <textarea
                id="c-i"
                rows={3}
                className={`${area} font-mono text-sm`}
                {...text("sampleInput")}
              />
            </Field>
            <Field id="c-o" label="Sample output">
              <textarea
                id="c-o"
                rows={3}
                className={`${area} font-mono text-sm`}
                {...text("sampleOutput")}
              />
            </Field>
          </div>
        </>
      )}

      {q.type === "MCQ" && (
        <>
          <Field id="m-q" label="Question">
            <textarea
              id="m-q"
              rows={4}
              className={area}
              {...text("statement")}
            />
          </Field>
          <Field id="m-code" label="Code or extra text" optional>
            <textarea
              id="m-code"
              rows={4}
              className={`${area} font-mono text-sm`}
              {...text("code")}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="lbl mb-1.5">
              Options{" "}
              <span className="font-normal text-ink-3 normal-case">
                (tick the right one if you know it)
              </span>
            </legend>
            {f.options.map((o, i) => (
              <div
                key={i}
                className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5"
              >
                <strong className="text-[15px]">{keys[i]}</strong>
                <input
                  aria-label={`Option ${keys[i]}`}
                  value={o}
                  maxLength={300}
                  onChange={(e) =>
                    onOptions(
                      f.options.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  className="field min-h-12 text-base"
                />
                <label className="flex min-h-11 items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="right"
                    checked={f.correct === keys[i]}
                    onChange={() => onCorrect(keys[i])}
                    className="size-4.5 accent-crimson"
                  />
                  Right
                </label>
              </div>
            ))}
            {f.options.length < 6 && (
              <button
                type="button"
                onClick={() => onOptions([...f.options, ""])}
                className="min-h-11 cursor-pointer self-start font-bold text-crimson hover:text-crimson-dark"
              >
                Add an option
              </button>
            )}
          </fieldset>
        </>
      )}

      {q.type === "APTITUDE" && (
        <>
          <Field id="a-q" label="Question">
            <textarea
              id="a-q"
              rows={4}
              className={area}
              {...text("statement")}
            />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Field id="a-o" label="Options" optional="one per line">
              <textarea
                id="a-o"
                rows={4}
                className={area}
                value={f.options.join("\n")}
                onChange={(e) =>
                  onOptions(e.target.value.split("\n").slice(0, 6))
                }
              />
            </Field>
            <Field id="a-a" label="Answer" optional="if you know it">
              <input
                id="a-a"
                maxLength={300}
                className="field min-h-12 text-base"
                {...text("correct")}
              />
            </Field>
          </div>
        </>
      )}

      {q.type === "SQL" && (
        <>
          <Field id="s-q" label="What the query must do">
            <textarea
              id="s-q"
              rows={3}
              className={area}
              {...text("statement")}
            />
          </Field>
          <Field id="s-s" label="Tables and columns">
            <textarea
              id="s-s"
              rows={4}
              className={`${area} font-mono text-sm`}
              {...text("tables")}
            />
          </Field>
          <Field id="s-o" label="Expected output" optional>
            <textarea
              id="s-o"
              rows={2}
              className={`${area} font-mono text-sm`}
              {...text("expected")}
            />
          </Field>
        </>
      )}

      {q.type === "WRITTEN" && (
        <>
          <Field id="w-q" label="Prompt">
            <textarea
              id="w-q"
              rows={4}
              className={area}
              {...text("statement")}
            />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <Field id="w-l" label="Word limit">
              <input
                id="w-l"
                type="number"
                min={1}
                className="field min-h-12 text-base"
                {...text("wordLimit")}
              />
            </Field>
            <Field id="w-t" label="Time given (minutes)">
              <input
                id="w-t"
                type="number"
                min={1}
                className="field min-h-12 text-base"
                {...text("timeMin")}
              />
            </Field>
          </div>
        </>
      )}

      <Field id="nt" label="Notes for other students" optional>
        <textarea
          id="nt"
          rows={2}
          maxLength={1000}
          value={q.notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="For example: hidden test cases, what timed out, how you approached it"
          className={area}
        />
      </Field>
    </>
  );
}

const area = "field min-h-24 resize-y px-3.5 py-3 text-base leading-relaxed";

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean | string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="lbl">
        {label}
        {optional && (
          <span className="font-normal text-ink-3 normal-case">
            {" "}
            ({typeof optional === "string" ? optional : "optional"})
          </span>
        )}
      </label>
      {children}
      {hint && <span className="text-sm text-ink-3">{hint}</span>}
    </div>
  );
}
