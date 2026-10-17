"use client";

import { useToast } from "@/components/Toast";

// Temporary (removed in step 5): shows the toast with Undo.
export function ToastCheck() {
  const toast = useToast();
  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={() =>
          toast("Saved to bookmarks", () => toast("Removed from bookmarks"))
        }
      >
        Show toast
      </button>
    </div>
  );
}
