"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { RoundType } from "@/generated/prisma/enums";
import { roundTypeLabel } from "@/lib/labels";
import { ROUND_TYPES } from "@/lib/submit";
import { type FormState, saveRoundDetails } from "@/server/actions/submit";

export type RoundOption = {
  id: string;
  name: string;
  type: RoundType;
  date: string | null; // "2025-08-14"
  platform: string | null;
  durationMin: number | null;
  verified: boolean;
};

export type RoundInitial = {
  roundId: string | null;
  roundType: RoundType;
  testDate: string;
  platform: string;
  durationMin: string;
  sections: { name: string; count: string }[];
  notes: string;
  method: "type" | "scan";
};

const PLATFORMS = [
  "HackerRank",
  "HackerEarth",
  "Mettl",
  "CoCubes",
  "Codility",
  "AMCAT",
  "TCS iON",
];

// S2. Pick the round, then the details. Choosing a round fills in the date,
// platform and duration the CDC has for it; the student can change them.
export function RoundForm({
  submissionId,
  rounds,
  initial,
}: {
  submissionId: string;
  rounds: RoundOption[];
  initial: RoundInitial;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveRoundDetails,
    {},
  );
  const e = state.errors ?? {};
  const startChoice =
    initial.roundId ??
    (rounds.length === 1 ? rounds[0].id : rounds.length ? "" : "new");
  // A pre-selected round fills in any details the draft does not have yet.
  const startRound = rounds.find((r) => r.id === startChoice);
  const [choice, setChoice] = useState(startChoice);
  const [roundType, setRoundType] = useState<RoundType>(initial.roundType);
  const [testDate, setTestDate] = useState(
    initial.testDate || startRound?.date || "",
  );
  const [platform, setPlatform] = useState(
    initial.platform || startRound?.platform || "",
  );
  const [duration, setDuration] = useState(
    initial.durationMin ||
      (startRound?.durationMin ? String(startRound.durationMin) : ""),
  );
  const [sections, setSections] = useState(
    initial.sections.length ? initial.sections : [{ name: "", count: "" }],
  );
  const [method, setMethod] = useState(initial.method);

  function pickRound(id: string) {
    setChoice(id);
    const r = rounds.find((x) => x.id === id);
    if (!r) return;
    if (r.date) setTestDate(r.date);
    if (r.platform) setPlatform(r.platform);
    if (r.durationMin) setDuration(String(r.durationMin));
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="submissionId" value={submissionId} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="lbl mb-2.5">Which round did you sit?</legend>
        {rounds.map((r) => (
          <Option
            key={r.id}
            name="round"
            value={r.id}
            checked={choice === r.id}
            onPick={pickRound}
          >
            <strong className="text-[17px]">{r.name}</strong>
            <span className="text-sm text-ink-3">
              {[
                r.date && formatDay(r.date),
                r.platform,
                !r.verified && "added by you",
              ]
                .filter(Boolean)
                .join(" · ") || "Details not shared yet"}
            </span>
          </Option>
        ))}
        <Option
          name="round"
          value="new"
          checked={choice === "new"}
          onPick={setChoice}
        >
          <strong className="text-[17px]">
            {rounds.length ? "My round is not listed" : "Add the round"}
          </strong>
          <span className="text-sm text-ink-3">
            The CDC checks it before anything is published.
          </span>
        </Option>
        <Error text={e.round} />
      </fieldset>

      {choice === "new" && (
        <div className="flex flex-col gap-2.5">
          <span className="lbl" id="rt-l">
            Round type
          </span>
          <div
            role="radiogroup"
            aria-labelledby="rt-l"
            className="flex flex-wrap pl-px"
          >
            {ROUND_TYPES.map((t) => (
              <label
                key={t}
                className="-ml-px flex min-h-12 cursor-pointer items-center border border-line-strong bg-white px-4.5 text-[15px] font-medium has-checked:relative has-checked:border-charcoal has-checked:bg-charcoal has-checked:font-bold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-charcoal"
              >
                <input
                  type="radio"
                  name="roundType"
                  value={t}
                  checked={roundType === t}
                  onChange={() => setRoundType(t)}
                  className="sr-only"
                />
                {roundTypeLabel[t]}
              </label>
            ))}
          </div>
          <Error text={e.roundType} />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-5">
        <Field id="dt" label="Test date" error={e.testDate}>
          <input
            id="dt"
            name="testDate"
            type="date"
            required
            value={testDate}
            onChange={(ev) => setTestDate(ev.target.value)}
            className="field min-h-12 text-base"
          />
        </Field>
        <Field id="pf" label="Platform">
          <input
            id="pf"
            name="platform"
            list="platforms"
            value={platform}
            onChange={(ev) => setPlatform(ev.target.value)}
            className="field min-h-12 text-base"
          />
          <datalist id="platforms">
            {PLATFORMS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field id="du" label="Duration in minutes" error={e.durationMin}>
          <input
            id="du"
            name="durationMin"
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(ev) => setDuration(ev.target.value)}
            className="field min-h-12 text-base"
          />
        </Field>
      </div>
      {rounds.length > 0 && (
        <p className="-mt-4 text-sm text-ink-3">
          Date, platform and duration are filled in from the round you picked.
          Change them if yours differed.
        </p>
      )}

      <fieldset className="flex flex-col gap-2.5">
        <legend className="lbl mb-1">
          Sections in the test{" "}
          <span className="font-normal text-ink-3 normal-case">(optional)</span>
        </legend>
        <div className="grid grid-cols-[minmax(0,1fr)_96px_48px] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_140px_48px]">
          <span className="text-sm text-ink-3">Section</span>
          <span className="text-sm text-ink-3">Questions</span>
          <span />
          {sections.map((s, i) => (
            <SectionRow
              key={i}
              index={i}
              value={s}
              onChange={(v) =>
                setSections(sections.map((x, j) => (j === i ? v : x)))
              }
              onRemove={() =>
                setSections(
                  sections.length > 1
                    ? sections.filter((_, j) => j !== i)
                    : [{ name: "", count: "" }],
                )
              }
            />
          ))}
        </div>
        <Error text={e.sections} />
        {sections.length < 10 && (
          <button
            type="button"
            onClick={() => setSections([...sections, { name: "", count: "" }])}
            className="min-h-11 cursor-pointer self-start font-bold text-crimson hover:text-crimson-dark"
          >
            Add a section
          </button>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nt" className="lbl">
          Anything else about the test?{" "}
          <span className="font-normal text-ink-3 normal-case">(optional)</span>
        </label>
        <textarea
          id="nt"
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={initial.notes}
          placeholder="Camera proctored, negative marking, could you switch between questions…"
          className="field min-h-24 resize-y px-3.5 py-3 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2.5 border-t border-line pt-6">
        <legend className="mb-3 text-xl font-bold">
          How will you add the questions?
        </legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          <Option
            name="method"
            value="type"
            checked={method === "type"}
            onPick={() => setMethod("type")}
          >
            <strong className="text-[17px]">Type them in</strong>
            <span className="text-sm text-ink-3">
              Best when you remember the questions clearly. A form per question.
            </span>
          </Option>
          <Option
            name="method"
            value="scan"
            checked={method === "scan"}
            onPick={() => setMethod("scan")}
          >
            <strong className="text-[17px]">Upload photos or a PDF</strong>
            <span className="text-sm text-ink-3">
              Rough sheets or notes, up to 10 pages. We read the text for you.
            </span>
          </Option>
        </div>
        <p className="text-sm text-ink-3">
          You can switch later, or use both: type some questions and upload the
          rest.
        </p>
      </fieldset>

      {state.message && (
        <p
          role="alert"
          className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
        >
          {state.message}{" "}
          {state.existingHref && (
            <Link href={state.existingHref} className="font-bold">
              Open it
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
        <Link href="/submit" className="btn-secondary">
          Back
        </Link>
        <span className="flex-auto text-right text-sm text-ink-3">
          Saved when you continue
        </span>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : method === "scan"
              ? "Continue to upload"
              : "Continue to type questions"}
        </button>
      </div>
    </form>
  );
}

function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function Option({
  name,
  value,
  checked,
  onPick,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onPick: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-start gap-3.5 bg-white ${
        checked
          ? "border-2 border-crimson p-[17px]"
          : "border border-[#BFBFBC] p-4.5"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
        className="mt-0.5 size-5 accent-crimson"
      />
      <span className="flex flex-col gap-0.5">{children}</span>
    </label>
  );
}

function SectionRow({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: { name: string; count: string };
  onChange: (v: { name: string; count: string }) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <input
        name="sectionName"
        aria-label={`Section ${index + 1} name`}
        value={value.name}
        maxLength={60}
        onChange={(ev) => onChange({ ...value, name: ev.target.value })}
        className="field min-h-12 text-base"
      />
      <input
        name="sectionCount"
        type="number"
        min={0}
        max={200}
        aria-label={`Section ${index + 1} question count`}
        value={value.count}
        onChange={(ev) => onChange({ ...value, count: ev.target.value })}
        className="field min-h-12 text-base"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove section ${index + 1}`}
        className="flex size-12 cursor-pointer items-center justify-center border border-[#BFBFBC] bg-white hover:border-charcoal"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="lbl">
        {label}
      </label>
      {children}
      <Error text={error} />
    </div>
  );
}

function Error({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <span role="alert" className="text-sm font-bold text-crimson">
      {text}
    </span>
  );
}
