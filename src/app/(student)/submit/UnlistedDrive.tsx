"use client";

import { useActionState, useState } from "react";
import { type FormState, startUnlisted } from "@/server/actions/submit";

// "My drive is not listed": the student adds the drive themselves. It stays
// unverified until the CDC attaches it to a real drive (CLAUDE.md 2a.1).
export function UnlistedDrive({
  companies,
  year,
}: {
  companies: string[];
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const [driveYear, setDriveYear] = useState(String(year));
  const [state, action, pending] = useActionState<FormState, FormData>(
    startUnlisted,
    {},
  );
  const e = state.errors ?? {};

  return (
    <div className="flex flex-col gap-3.5 border-t border-line pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="unlisted"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 cursor-pointer items-center gap-2.5 self-start font-bold text-crimson hover:text-crimson-dark"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="square"
        >
          <path d="M5 12h14" />
          {!open && <path d="M12 5v14" />}
        </svg>
        I do not have a PIN / my drive is not listed
      </button>
      <form
        id="unlisted"
        hidden={!open}
        action={action}
        className="flex flex-col gap-4 bg-grey-band p-6"
      >
        <p className="text-[15px]">
          Tell us about the drive and carry on. The CDC checks it before
          anything is published, and adds it to the question bank if it is real.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Field id="rq-co" label="Company" error={e.company}>
            <input
              id="rq-co"
              name="company"
              list="company-names"
              required
              className="field min-h-12 text-base"
            />
            <datalist id="company-names">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="rq-role" label="Role" error={e.role}>
            <input
              id="rq-role"
              name="role"
              required
              className="field min-h-12 text-base"
            />
          </Field>
          <Field id="rq-year" label="Year of the drive" error={e.year}>
            <input
              id="rq-year"
              name="year"
              type="number"
              value={driveYear}
              onChange={(ev) => setDriveYear(ev.target.value)}
              min={2015}
              max={year + 1}
              required
              className="field min-h-12 text-base"
            />
          </Field>
          <Field id="rq-date" label="Test date (optional)" error={e.testDate}>
            <input
              id="rq-date"
              name="testDate"
              type="date"
              onChange={(ev) => {
                // The drive's year follows the test date.
                const y = ev.target.value.slice(0, 4);
                if (/^\d{4}$/.test(y)) setDriveYear(y);
              }}
              className="field min-h-12 text-base"
            />
          </Field>
        </div>
        {state.message && (
          <p
            role="alert"
            className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn-secondary self-start disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add the drive and continue"}
        </button>
      </form>
    </div>
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
      {error && (
        <span role="alert" className="text-sm font-bold text-crimson">
          {error}
        </span>
      )}
    </div>
  );
}
