"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { withdrawSubmission } from "@/server/actions/review";

// S6 while the submission waits for the CDC: Edit, or Withdraw with an
// inline confirm.
export function WithdrawPanel({ submissionId }: { submissionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="wd-h"
        aria-describedby="wd-d"
        className="flex flex-col gap-3 border-2 border-charcoal p-5"
      >
        <h2 id="wd-h" ref={heading} tabIndex={-1} className="text-lg font-bold">
          Withdraw this submission?
        </h2>
        <p id="wd-d" className="text-[15px] text-ink-3">
          The CDC will not see it and its questions are deleted. You can submit
          this round again later.
        </p>
        {error && (
          <p role="alert" className="text-[15px] font-bold text-crimson">
            {error}
          </p>
        )}
        <span className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await withdrawSubmission(submissionId);
                if (r?.message) setError(r.message);
              })
            }
            className="btn-primary"
          >
            {pending ? "Withdrawing…" : "Yes, withdraw"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="btn-secondary"
          >
            Keep it
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-3 border-amber bg-peach px-5 py-4">
      <span className="max-w-130 text-[15px]">
        <strong>Waiting for the CDC.</strong> You can still edit or withdraw
        this until the review starts.
      </span>
      <span className="flex flex-wrap gap-2.5">
        <Link href={`/submit/${submissionId}/review`} className="btn-primary">
          Edit
        </Link>
        <button
          type="button"
          onClick={() => {
            setConfirming(true);
            requestAnimationFrame(() => heading.current?.focus());
          }}
          className="btn-secondary"
        >
          Withdraw
        </button>
      </span>
    </div>
  );
}
