"use client";

import { useState, useTransition } from "react";
import { BLOCK_REASONS } from "@/lib/admin";
import { setStudentBlocked } from "@/server/admin/actions/students";

// Block account (asks first, with a CDC-only reason) / Unblock.
export function BlockControls({
  userId,
  name,
  blocked,
  pending: waiting,
}: {
  userId: string;
  name: string;
  blocked: boolean;
  pending: number; // submissions waiting for review
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState(BLOCK_REASONS[0]);
  const [pending, startTransition] = useTransition();

  if (blocked) {
    return (
      <button
        type="button"
        className="btn-secondary self-start"
        disabled={pending}
        onClick={() => startTransition(() => setStudentBlocked(userId, false))}
      >
        {pending ? "Unblocking…" : "Unblock"}
      </button>
    );
  }
  if (!asking) {
    return (
      <button
        type="button"
        className="btn-secondary self-start"
        onClick={() => setAsking(true)}
      >
        Block account
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-labelledby="bl-h"
      className="flex flex-col gap-3 border-2 border-charcoal bg-white p-4"
    >
      <h3 id="bl-h" className="text-lg font-bold">
        Block {name}?
      </h3>
      <p className="text-[15px]">
        They can still sign in but cannot submit or browse questions.
        {waiting > 0 &&
          ` Their ${waiting === 1 ? "waiting submission is" : `${waiting} waiting submissions are`} set aside, not deleted.`}
      </p>
      <label htmlFor="bl-r" className="lbl">
        Reason, for the CDC only
      </label>
      <select
        id="bl-r"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-11 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:outline-none"
      >
        {BLOCK_REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <span className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setStudentBlocked(userId, true, reason);
              setAsking(false);
            })
          }
        >
          {pending ? "Blocking…" : "Block account"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setAsking(false)}
        >
          Cancel
        </button>
      </span>
    </div>
  );
}
