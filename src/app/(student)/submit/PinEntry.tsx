"use client";

import { useActionState, useRef, useState } from "react";
import { checkPin, type PinState, startFromPin } from "@/server/actions/submit";

const LENGTH = 6;

// Six digit boxes shown as [][][] [][][]. Typing moves to the next box,
// Backspace goes back, and pasting "482 915" or "482-915" fills them all.
export function PinEntry() {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const [checked, check, checking] = useActionState<PinState, FormData>(
    checkPin,
    {
      status: "idle",
    },
  );
  const [started, start, starting] = useActionState<PinState, FormData>(
    startFromPin,
    {
      status: "idle",
    },
  );
  const pin = digits.join("");

  function fill(from: number, text: string) {
    const clean = text.replace(/\D/g, "").slice(0, LENGTH - from);
    if (!clean) return;
    const next = [...digits];
    [...clean].forEach((d, i) => (next[from + i] = d));
    setDigits(next);
    boxes.current[Math.min(from + clean.length, LENGTH - 1)]?.focus();
  }

  if (checked.status === "ok") {
    const error = started.status === "error" ? started.message : null;
    return (
      <form action={start} className="flex flex-col gap-5">
        <input type="hidden" name="pin" value={checked.pin} />
        <div className="flex flex-col gap-1 border-l-3 border-[#23683A] bg-[#E3F1E7] px-5 py-4">
          <span className="lbl text-[#23683A]">PIN accepted</span>
          <strong className="text-xl">
            {checked.company} · {checked.drive}
          </strong>
        </div>
        {checked.roles.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="lbl mb-2.5">
              Which role did you sit the test for?
            </legend>
            {checked.roles.map((role, i) => (
              <label
                key={role}
                className="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-center gap-3.5 border border-[#BFBFBC] bg-white p-4.5 has-checked:border-2 has-checked:border-crimson has-checked:p-[17px]"
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  defaultChecked={i === 0}
                  className="size-5 accent-crimson"
                />
                <strong className="text-[17px]">{role}</strong>
              </label>
            ))}
          </fieldset>
        )}
        {error && (
          <p
            role="alert"
            className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="min-h-11 cursor-pointer font-bold text-crimson hover:text-crimson-dark"
            onClick={() => window.location.reload()}
          >
            Use a different PIN
          </button>
          <button
            type="submit"
            disabled={starting}
            className="btn-primary disabled:opacity-60"
          >
            {starting ? "Starting…" : "Continue to round details"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={check} className="flex flex-col gap-4">
      <input type="hidden" name="pin" value={pin} />
      <div
        role="group"
        aria-labelledby="pin-label"
        className="flex flex-col gap-2.5"
      >
        <span id="pin-label" className="lbl">
          Drive PIN
        </span>
        <div className="flex items-center gap-2 sm:gap-2.5">
          {digits.map((d, i) => (
            <span key={i} className="contents">
              {i === 3 && <span aria-hidden="true" className="w-2 sm:w-4" />}
              <input
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1} of ${LENGTH}`}
                maxLength={12}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v.length > 1) return fill(i, v);
                  const next = [...digits];
                  next[i] = v;
                  setDigits(next);
                  if (v && i < LENGTH - 1) boxes.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) {
                    boxes.current[i - 1]?.focus();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  fill(i, e.clipboardData.getData("text"));
                }}
                className="size-12 border border-line-strong bg-white text-center font-mono text-2xl font-bold focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none sm:size-14"
              />
            </span>
          ))}
        </div>
        <p className="text-sm text-ink-3">
          The CDC gives each drive&apos;s PIN to the students on its shortlist.
        </p>
      </div>
      {checked.status === "error" && (
        <p
          role="alert"
          className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
        >
          {checked.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pin.length < LENGTH || checking}
        className="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checking ? "Checking…" : "Check PIN"}
      </button>
    </form>
  );
}
