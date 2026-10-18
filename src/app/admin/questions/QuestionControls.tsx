"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  mergeQuestion,
  setQuestionLive,
  updateQuestion,
} from "@/server/admin/actions/questions";

const field =
  "min-h-11 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";

type Option = { value: string; label: string };

// Search and filters. Every change goes into the URL (replace), so Back
// restores the view; changing a filter goes back to page 1.
export function QuestionFilterBar({
  companies,
  years,
  topics,
}: {
  companies: Option[];
  years: number[];
  topics: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    next.delete("edit");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  const select = (
    key: string,
    label: string,
    all: string,
    options: Option[],
  ) => (
    <select
      aria-label={label}
      value={params.get(key) ?? ""}
      onChange={(e) => update(key, e.target.value)}
      className={`${field} flex-[0_1_170px]`}
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        update("q", q.trim());
      }}
      className="flex flex-wrap gap-3"
    >
      <input
        type="search"
        aria-label="Search questions"
        placeholder="Search question text"
        value={q}
        className={`${field} max-w-95 flex-[1_1_260px]`}
        onChange={(e) => {
          const value = e.target.value;
          setQ(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => update("q", value.trim()), 300);
        }}
      />
      {select("company", "Company", "All companies", companies)}
      {select(
        "year",
        "Year",
        "All years",
        years.map((y) => ({ value: String(y), label: String(y) })),
      )}
      {select("type", "Type", "All types", [
        { value: "coding", label: "Coding" },
        { value: "mcq", label: "MCQ" },
        { value: "aptitude", label: "Aptitude" },
        { value: "sql", label: "SQL" },
        { value: "written", label: "Written" },
      ])}
      {select("topic", "Topic", "All topics", topics)}
      <select
        aria-label="Show"
        value={params.get("show") ?? ""}
        onChange={(e) => update("show", e.target.value)}
        className={`${field} flex-[0_1_170px]`}
      >
        <option value="">Live</option>
        <option value="unpublished">Unpublished</option>
      </select>
    </form>
  );
}

// Unpublish (confirmed in place, with an optional reason) or Republish.
export function LiveToggle({ id, live }: { id: string; live: boolean }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!live) {
    return (
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        disabled={pending}
        onClick={() => startTransition(() => setQuestionLive(id, true))}
      >
        Republish
      </button>
    );
  }
  if (!asking) {
    return (
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        onClick={() => setAsking(true)}
      >
        Unpublish
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Unpublish this question?"
      className="mt-2 flex flex-col gap-2 border-2 border-charcoal p-3 text-left text-sm whitespace-normal"
    >
      <span>
        <strong>Unpublish?</strong> Students stop seeing it at once. You can
        republish it later.
      </span>
      <input
        aria-label="Reason, for the CDC only"
        placeholder="Reason, for the CDC only"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={`${field} min-h-9 w-full`}
      />
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary min-h-9 px-3"
          disabled={pending}
          onClick={() =>
            startTransition(() => setQuestionLive(id, false, reason))
          }
        >
          {pending ? "Unpublishing…" : "Unpublish"}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3"
          onClick={() => setAsking(false)}
        >
          Cancel
        </button>
      </span>
    </div>
  );
}

// The edit panel under the list (A09).
export function EditQuestion({
  question,
  tagNames,
  candidates,
  closeHref,
}: {
  question: {
    id: string;
    title: string;
    bodyMarkdown: string;
    type: string;
    difficulty: string;
    topics: string[];
  };
  tagNames: string[];
  candidates: { id: string; label: string }[];
  closeHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(question.title);
  const [text, setText] = useState(question.bodyMarkdown);
  const [type, setType] = useState(question.type);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [topics, setTopics] = useState(question.topics.join(", "));
  const [merging, setMerging] = useState(false);
  const [into, setInto] = useState(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const done = (result: { error: string | null }) => {
    if (result.error) setError(result.error);
    else router.replace(closeHref, { scroll: false });
  };

  return (
    <section
      id="edit"
      aria-labelledby="ed-h"
      className="flex max-w-215 scroll-mt-4 flex-col gap-3 border-2 border-charcoal p-5.5"
    >
      <h2 id="ed-h" className="text-lg font-bold">
        Edit: {question.title}
      </h2>
      <label className="lbl" htmlFor="ed-title">
        Title
      </label>
      <input
        id="ed-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${field} w-full`}
      />
      <label className="lbl" htmlFor="ed-text">
        Question text
      </label>
      <textarea
        id="ed-text"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-y border border-line-strong bg-white px-3.5 py-3 font-mono text-[13px] leading-relaxed focus:border-charcoal focus:outline-none"
      />
      <datalist id="ed-topics">
        {tagNames.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Topics"
          list="ed-topics"
          value={topics}
          placeholder="Binary search, Greedy"
          onChange={(e) => setTopics(e.target.value)}
          className={`${field} flex-[1_1_240px]`}
        />
        <select
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={`${field} w-37.5`}
        >
          <option value="CODING">Coding</option>
          <option value="MCQ">MCQ</option>
          <option value="APTITUDE">Aptitude</option>
          <option value="SQL">SQL</option>
          <option value="WRITTEN">Written</option>
        </select>
        <select
          aria-label="Difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className={`${field} w-32.5`}
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>
      {error && <p className="font-bold text-crimson">{error}</p>}
      <span className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () =>
              done(
                await updateQuestion({
                  id: question.id,
                  title,
                  text,
                  type,
                  difficulty,
                  topics: topics
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                }),
              ),
            )
          }
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link href={closeHref} scroll={false} className="btn-secondary">
          Cancel
        </Link>
        <button
          type="button"
          className="btn-secondary"
          disabled={candidates.length === 0}
          onClick={() => setMerging((m) => !m)}
        >
          Merge with another question
        </button>
      </span>
      {merging && (
        <div className="flex flex-col gap-2 bg-grey-band p-4 text-sm">
          <label className="lbl" htmlFor="ed-into">
            Merge into
          </label>
          <select
            id="ed-into"
            value={into}
            onChange={(e) => setInto(e.target.value)}
            className={`${field} w-full`}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-[13px] text-ink-3">
            The question you pick keeps its wording and gains this one&apos;s
            sources, credits, rounds and bookmarks. This one is unpublished.
          </span>
          <button
            type="button"
            className="btn-primary self-start"
            disabled={pending || !into}
            onClick={() =>
              startTransition(async () =>
                done(await mergeQuestion(question.id, into)),
              )
            }
          >
            Merge
          </button>
        </div>
      )}
    </section>
  );
}
