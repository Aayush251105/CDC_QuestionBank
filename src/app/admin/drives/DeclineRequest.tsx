"use client";

import { useState, useTransition } from "react";
import { declineDriveRequest } from "@/server/admin/actions/drives";

// Decline asks for confirmation in place, naming what will change (A00a 05).
export function DeclineRequest({
  driveId,
  company,
  submissions,
}: {
  driveId: string;
  company: string;
  submissions: number;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        onClick={() => setAsking(true)}
      >
        Decline
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label={`Decline the ${company} request?`}
      className="mt-2 flex flex-col gap-2 border-2 border-charcoal p-3 text-left text-sm whitespace-normal"
    >
      <span>
        <strong>Decline the {company} request?</strong>{" "}
        {submissions > 0
          ? `Its ${submissions === 1 ? "submission is" : `${submissions} submissions are`} closed without publishing. The student only sees "Reviewed".`
          : "It leaves this list."}
      </span>
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary min-h-9 px-3"
          disabled={pending}
          onClick={() => startTransition(() => declineDriveRequest(driveId))}
        >
          {pending ? "Declining…" : "Decline request"}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3"
          disabled={pending}
          onClick={() => setAsking(false)}
        >
          Keep
        </button>
      </span>
    </div>
  );
}
