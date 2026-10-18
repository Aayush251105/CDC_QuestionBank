"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setCreditByDefault } from "@/server/actions/profile";

// "Credit me by name by default". Saves as soon as it is ticked.
export function CreditToggle({ initial }: { initial: boolean }) {
  const [credit, setCredit] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px]">
      <input
        type="checkbox"
        checked={credit}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setCredit(next);
          startTransition(async () => {
            try {
              const saved = await setCreditByDefault(next);
              setCredit(saved.credit);
              toast(
                saved.credit
                  ? "You will be credited by name"
                  : "You will stay anonymous",
              );
            } catch {
              setCredit(!next);
              toast("Could not save. Please try again.");
            }
          });
        }}
        className="mt-0.5 size-5 shrink-0 accent-crimson"
      />
      <span>
        <strong>Credit me by name by default</strong> on new submissions. You
        can still change it each time you submit. Without credit, your questions
        appear without a name.
      </span>
    </label>
  );
}
