"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// A short message at the bottom ("Saved to bookmarks", Undo) that fades after 4 s.
type Toast = { id: number; message: string; onUndo?: () => void };

const ToastContext = createContext<
  (message: string, onUndo?: () => void) => void
>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);

  const show = useCallback((message: string, onUndo?: () => void) => {
    setLeaving(false);
    setToast({ id: Date.now(), message, onUndo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const fade = setTimeout(() => setLeaving(true), 3700);
    const remove = setTimeout(() => setToast(null), 4000);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-6 bg-charcoal px-5 py-3 text-[15px] text-cream transition-opacity duration-300 ${
              leaving ? "opacity-0" : "opacity-100"
            }`}
          >
            <span>{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  setToast(null);
                }}
                className="min-h-11 cursor-pointer font-bold text-white underline underline-offset-3"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
