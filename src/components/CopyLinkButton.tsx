"use client";

import { useToast } from "@/components/Toast";

// Copies the current page address and confirms with a toast.
export function CopyLinkButton() {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast("Link copied");
        } catch {
          toast("Could not copy. Copy the address from the browser bar.");
        }
      }}
    >
      Copy link
    </button>
  );
}
