"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setSaveQuestion } from "@/server/actions/bookmarks";

// One saved question with a Remove button. The row disappears at once and
// the toast offers Undo.
export function SavedQuestion({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function save(keep: boolean) {
    setRemoved(!keep);
    startTransition(async () => {
      try {
        const { saved } = await setSaveQuestion(id, keep);
        setRemoved(!saved);
        if (!saved) toast("Removed from bookmarks", () => save(true));
      } catch {
        setRemoved(keep);
        toast("Could not save. Please try again.");
      }
    });
  }

  if (removed) return null;
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line py-4.5">
      <span className="flex min-w-0 flex-col gap-1">
        <Link
          href={`/questions/${id}`}
          className="text-[17px] font-bold text-charcoal no-underline hover:text-crimson"
        >
          {title}
        </Link>
        <span className="text-sm text-ink-3">{meta}</span>
      </span>
      <button
        type="button"
        onClick={() => save(false)}
        aria-label={`Remove bookmark: ${title}`}
        className="btn-secondary shrink-0"
      >
        Remove
      </button>
    </li>
  );
}
