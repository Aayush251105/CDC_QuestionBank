"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAllVerified } from "@/server/admin/actions/review";

// "Switch drive": jump to another drive's batch.
export function DriveSwitcher({
  current,
  drives,
}: {
  current: string;
  drives: { id: string; title: string; n: number }[];
}) {
  const router = useRouter();
  const options = drives.some((d) => d.id === current)
    ? drives
    : [{ id: current, title: "This drive", n: 0 }, ...drives];
  return (
    <>
      <label htmlFor="drv" className="sr-only">
        Switch drive
      </label>
      <select
        id="drv"
        value={current}
        onChange={(e) => router.push(`/admin/drives/${e.target.value}/review`)}
        className="min-h-11 min-w-65 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:outline-none"
      >
        {options.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title.replace(/ · /g, " ")} · {d.n}
          </option>
        ))}
      </select>
    </>
  );
}

// "Approve all verified (N)", confirmed in place.
export function ApproveAllVerified({
  driveId,
  count,
}: {
  driveId: string;
  count: number;
}) {
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          className="btn-primary"
          disabled={count === 0}
          onClick={() => {
            setDone(null);
            setAsking(true);
          }}
        >
          Approve all verified ({count})
        </button>
        {done !== null && (
          <span role="status" className="text-sm text-ink-3">
            {done} {done === 1 ? "submission" : "submissions"} published.
          </span>
        )}
      </span>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Approve all verified?"
      className="flex max-w-120 flex-col gap-2 border-2 border-charcoal bg-white p-3 text-sm"
    >
      <span>
        <strong>
          Publish {count} verified {count === 1 ? "submission" : "submissions"}?
        </strong>{" "}
        Every question in them goes live as sent, with the cleaned text.
        Submissions with duplicates are left for you to merge.
      </span>
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary min-h-9 px-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const n = await approveAllVerified(driveId);
              setDone(n);
              setAsking(false);
            })
          }
        >
          {pending ? "Publishing…" : "Publish them"}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3"
          disabled={pending}
          onClick={() => setAsking(false)}
        >
          Cancel
        </button>
      </span>
    </div>
  );
}
