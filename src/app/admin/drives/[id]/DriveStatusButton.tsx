"use client";

import { useState, useTransition } from "react";
import { setDriveStatus } from "@/server/admin/actions/drives";

// Close drive / Reopen drive / Open drive, confirmed in place (A00a 05).
export function DriveStatusButton({
  driveId,
  status,
}: {
  driveId: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const to = status === "OPEN" ? "CLOSED" : "OPEN";
  const label =
    status === "OPEN"
      ? "Close drive"
      : status === "DRAFT"
        ? "Open drive"
        : "Reopen drive";
  const consequence =
    to === "CLOSED"
      ? "Students can no longer submit to it and its PIN stops working. Submissions already made are not affected."
      : "Students with its PIN can submit to it again while the window is open.";

  if (!asking) {
    return (
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label={`${label}?`}
      className="flex max-w-120 flex-col gap-2 border-2 border-charcoal bg-white p-3 text-sm"
    >
      <span>
        <strong>{label}?</strong> {consequence}
      </span>
      {error && <span className="font-bold text-crimson">{error}</span>}
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary min-h-9 px-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setDriveStatus(driveId, to);
              if (result.error) setError(result.error);
              else setAsking(false);
            })
          }
        >
          {pending ? "Saving…" : label}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3"
          disabled={pending}
          onClick={() => {
            setAsking(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </span>
    </div>
  );
}
