"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import {
  defaultCloseDate,
  parseDateInput,
  toDateInput,
  type RoundTypeKey,
} from "@/lib/admin";
import {
  createDrive,
  updateDrive,
  type DriveFormState,
} from "@/server/admin/actions/drives";

export type RoundRow = {
  id?: string; // existing round (edit form)
  locked?: boolean; // has submissions, questions or a shortlist: cannot be removed
  type: RoundTypeKey;
  date: string;
  platform: string;
  durationMin: string;
};

export type DriveFormValues = {
  driveId?: string; // edit form
  requestId: string | null;
  company: string;
  year: number;
  season?: string;
  roles: string;
  ctcBand?: string;
  eligibility?: string;
  opensAt?: string;
  closesAt?: string;
  requirePin?: boolean;
  rounds: RoundRow[];
};

const TYPE_OPTIONS: { value: RoundTypeKey; label: string }[] = [
  { value: "OA", label: "Online assessment" },
  { value: "TECHNICAL", label: "Technical interview" },
  { value: "HR", label: "HR interview" },
  { value: "GD", label: "Group discussion" },
];

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] text-charcoal focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const th =
  "border-b-2 border-charcoal px-2 py-2.5 text-left text-xs font-bold tracking-[0.08em] text-ink-3 uppercase";

function Legend({ n, children }: { n: number; children: string }) {
  return (
    <legend className="mb-4 w-full border-b-2 border-charcoal pb-2 text-xl font-bold">
      <span className="text-crimson">{n}</span> · {children}
    </legend>
  );
}

// A03 New drive and A04 Edit drive. Rounds are edited here and sent as
// JSON in one hidden field. When editing, company and year are fixed.
export function DriveForm({
  mode,
  initial,
  companies = [],
  years = [],
  windowDays = 14,
}: {
  mode: "create" | "edit";
  initial: DriveFormValues;
  companies?: string[];
  years?: number[];
  windowDays?: number; // A13 "PIN works for, after the last round"
}) {
  const editing = mode === "edit";
  const [state, action, pending] = useActionState<DriveFormState, FormData>(
    editing ? updateDrive : createDrive,
    { error: null },
  );
  const [rounds, setRounds] = useState<RoundRow[]>(initial.rounds);
  const [requirePin, setRequirePin] = useState(initial.requirePin ?? true);
  const [generate, setGenerate] = useState(true);

  const closeHint = defaultCloseDate(
    rounds.map((r) => parseDateInput(r.date)),
    windowDays,
  );
  const setRound = (i: number, patch: Partial<RoundRow>) =>
    setRounds((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form
      // Submitting through onSubmit keeps what was typed if the server
      // sends back an error (a form `action` would reset the inputs).
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(e.currentTarget, submitter);
        startTransition(() => action(data));
      }}
      className="flex max-w-230 flex-col gap-9 px-5 pt-7 pb-12 sm:px-8"
    >
      {initial.driveId && (
        <input type="hidden" name="driveId" value={initial.driveId} />
      )}
      {initial.requestId && (
        <input type="hidden" name="requestId" value={initial.requestId} />
      )}
      <input type="hidden" name="rounds" value={JSON.stringify(rounds)} />

      {state.error && (
        <p
          role="alert"
          className="border-l-3 border-crimson bg-grey-band px-4 py-3 font-bold"
        >
          {state.error}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <Legend n={1}>Company and year</Legend>
        <div className="grid gap-4 sm:grid-cols-4">
          {editing ? (
            <>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="lbl">Company</span>
                <span className="flex min-h-11 items-center font-bold">
                  {initial.company}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="lbl">Year</span>
                <span className="flex min-h-11 items-center font-bold">
                  {initial.year}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="d-co" className="lbl">
                  Company
                </label>
                <input
                  id="d-co"
                  name="company"
                  list="d-companies"
                  required
                  defaultValue={initial.company}
                  autoComplete="off"
                  className={field}
                />
                <datalist id="d-companies">
                  {companies.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="text-[13px] text-ink-3">
                  Not in the list?{" "}
                  <Link href="/admin/companies">Add a company</Link>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="d-yr" className="lbl">
                  Year
                </label>
                <select
                  id="d-yr"
                  name="year"
                  defaultValue={initial.year}
                  className={field}
                >
                  {[...new Set([...years, initial.year])].sort().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-se" className="lbl">
              Season
            </label>
            <select
              id="d-se"
              name="season"
              defaultValue={initial.season ?? "Internship"}
              className={field}
            >
              <option>Internship</option>
              <option>Full time</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <Legend n={2}>Roles and eligibility</Legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="d-ro" className="lbl">
              Roles offered
            </label>
            <input
              id="d-ro"
              name="roles"
              required
              defaultValue={initial.roles}
              placeholder="SDE intern, SDE I"
              className={field}
            />
            <span className="text-[13px] text-ink-3">
              Separate roles with commas
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-ctc" className="lbl">
              CTC band
            </label>
            <input
              id="d-ctc"
              name="ctcBand"
              defaultValue={initial.ctcBand}
              placeholder="e.g. B"
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-el" className="lbl">
              Eligible batches
            </label>
            <input
              id="d-el"
              name="eligibility"
              defaultValue={initial.eligibility}
              placeholder="2026, 2027"
              className={field}
            />
          </div>
        </div>
      </fieldset>

      <fieldset id="rounds" className="flex scroll-mt-4 flex-col gap-3">
        <Legend n={3}>Rounds</Legend>
        {rounds.length === 0 ? (
          <p className="text-ink-3">
            No rounds yet. The drive stays a draft until it has one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    No.
                  </th>
                  <th scope="col" className={th}>
                    Type
                  </th>
                  <th scope="col" className={th}>
                    Date
                  </th>
                  <th scope="col" className={th}>
                    Platform
                  </th>
                  <th scope="col" className={th}>
                    Duration (min)
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i}>
                    <td className="border-b border-line px-2 py-3 align-middle font-bold text-crimson">
                      {i + 1}
                    </td>
                    <td className="border-b border-line px-2 py-3">
                      <select
                        aria-label={`Round ${i + 1} type`}
                        value={r.type}
                        onChange={(e) =>
                          setRound(i, { type: e.target.value as RoundTypeKey })
                        }
                        className={`${field} min-w-44`}
                      >
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-line px-2 py-3">
                      <input
                        type="date"
                        aria-label={`Round ${i + 1} date`}
                        value={r.date}
                        onChange={(e) => setRound(i, { date: e.target.value })}
                        className={field}
                      />
                    </td>
                    <td className="border-b border-line px-2 py-3">
                      <input
                        aria-label={`Round ${i + 1} platform`}
                        value={r.platform}
                        placeholder="HackerRank"
                        onChange={(e) =>
                          setRound(i, { platform: e.target.value })
                        }
                        className={field}
                      />
                    </td>
                    <td className="border-b border-line px-2 py-3">
                      <input
                        type="number"
                        min={1}
                        aria-label={`Round ${i + 1} duration in minutes`}
                        value={r.durationMin}
                        onChange={(e) =>
                          setRound(i, { durationMin: e.target.value })
                        }
                        className={`${field} w-27.5`}
                      />
                    </td>
                    <td className="border-b border-line px-2 py-3 align-middle">
                      <button
                        type="button"
                        aria-label={`Remove round ${i + 1}`}
                        disabled={r.locked}
                        title={
                          r.locked
                            ? "Has submissions, questions or a shortlist"
                            : undefined
                        }
                        onClick={() =>
                          setRounds((rs) => rs.filter((_, j) => j !== i))
                        }
                        className="btn-secondary min-h-9 px-3 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          className="btn-secondary self-start"
          onClick={() =>
            setRounds((rs) => [
              ...rs,
              { type: "TECHNICAL", date: "", platform: "", durationMin: "" },
            ])
          }
        >
          Add a round
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <Legend n={4}>Submissions and PIN</Legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-wf" className="lbl">
              Open from
            </label>
            <input
              id="d-wf"
              name="opensAt"
              type="date"
              defaultValue={initial.opensAt}
              className={field}
            />
            <span className="text-[13px] text-ink-3">
              Empty: the first round&apos;s date
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-wt" className="lbl">
              Close on
            </label>
            <input
              id="d-wt"
              name="closesAt"
              type="date"
              defaultValue={initial.closesAt}
              className={field}
            />
            <span className="text-[13px] text-ink-3">
              Default: {windowDays} days after the last round
              {closeHint ? ` (${toDateInput(closeHint)})` : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 border-y border-line py-4">
          <span className="flex flex-col">
            <strong id="req-pin-label">Require a PIN to submit</strong>
            <span className="text-sm text-ink-3">
              Only students with this drive&apos;s PIN can submit to it. Turn
              off only for an older drive run without PINs.
            </span>
          </span>
          <input
            type="hidden"
            name="requirePin"
            value={requirePin ? "on" : ""}
          />
          <button
            type="button"
            role="switch"
            aria-checked={requirePin}
            aria-labelledby="req-pin-label"
            onClick={() => setRequirePin((v) => !v)}
            className={`flex h-7.5 w-13 flex-none border border-charcoal p-0.75 ${
              requirePin ? "justify-end bg-crimson" : "justify-start bg-white"
            }`}
          >
            <span
              className={`size-5.5 ${requirePin ? "bg-white" : "bg-charcoal"}`}
            />
          </button>
        </div>
        {requirePin && !editing && (
          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              name="generatePin"
              checked={generate}
              onChange={(e) => setGenerate(e.target.checked)}
              className="mt-0.5 size-5 flex-none accent-crimson"
            />
            <span>
              <strong>Generate the PIN when I create the drive.</strong> You
              will see it on the next page with a message ready to send.
            </span>
          </label>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
        <Link
          href={editing ? `/admin/drives/${initial.driveId}` : "/admin/drives"}
          className="btn-secondary"
        >
          Cancel
        </Link>
        {editing ? (
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <span className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="btn-secondary"
            >
              Save as draft
            </button>
            <button
              type="submit"
              name="intent"
              value="create"
              disabled={pending}
              className="btn-primary"
            >
              {pending ? "Saving…" : "Create drive"}
            </button>
          </span>
        )}
      </div>
    </form>
  );
}
