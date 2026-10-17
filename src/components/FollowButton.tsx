"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setFollowCompany } from "@/server/actions/bookmarks";

// Follow / Following toggle. Changes at once, saves in the background and
// offers Undo in the toast.
export function FollowButton({
  companyId,
  companyName,
  initial,
  label = "Follow",
}: {
  companyId: string;
  companyName: string;
  initial: boolean;
  label?: string;
}) {
  const [following, setFollowing] = useState(initial);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function save(next: boolean, withUndo: boolean) {
    setFollowing(next);
    startTransition(async () => {
      try {
        const result = await setFollowCompany(companyId, next);
        setFollowing(result.following);
        if (withUndo) {
          toast(
            result.following
              ? `Following ${companyName}`
              : `Unfollowed ${companyName}`,
            () => save(!result.following, false),
          );
        }
      } catch {
        setFollowing(!next);
        toast("Could not save. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={`${following ? "Following" : label} ${companyName}`}
      onClick={() => save(!following, true)}
      className={`min-h-11 min-w-24 cursor-pointer border px-3 text-sm font-bold sm:min-w-28 sm:px-3.5 ${
        following
          ? "border-charcoal bg-charcoal text-white hover:bg-ink-2"
          : "border-line-strong bg-white text-charcoal hover:border-charcoal"
      }`}
    >
      {following ? "Following" : label}
    </button>
  );
}
