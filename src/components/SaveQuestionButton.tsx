"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setSaveQuestion } from "@/server/actions/bookmarks";

// "Save question" / "Saved". Changes at once, saves in the background and
// offers Undo in the toast ("Saved to bookmarks").
export function SaveQuestionButton({
  questionId,
  initial,
  label = "Save question",
}: {
  questionId: string;
  initial: boolean;
  label?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function save(next: boolean, withUndo: boolean) {
    setSaved(next);
    startTransition(async () => {
      try {
        const result = await setSaveQuestion(questionId, next);
        setSaved(result.saved);
        if (withUndo) {
          toast(
            result.saved ? "Saved to bookmarks" : "Removed from bookmarks",
            () => save(!result.saved, false),
          );
        }
      } catch {
        setSaved(!next);
        toast("Could not save. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => save(!saved, true)}
      className={`min-h-11 cursor-pointer border px-4 text-sm font-bold ${
        saved
          ? "border-charcoal bg-charcoal text-white hover:bg-ink-2"
          : "border-charcoal bg-transparent text-charcoal hover:bg-charcoal hover:text-white"
      }`}
    >
      {saved ? "Saved" : label}
    </button>
  );
}
