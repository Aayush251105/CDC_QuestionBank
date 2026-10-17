"use client";

import { useState } from "react";

export type AccordionItem = {
  id: string;
  number: string; // "01"
  title: string;
  meta: string; // "Coding · Medium · Sliding window, Hashing"
  content: React.ReactNode; // rendered on the server
};

// Numbered questions that expand in place: plus turns into minus, 150 ms.
// The first question starts open, like the design.
export function QuestionAccordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.slice(0, 1).map((i) => i.id)),
  );
  const allOpen = items.length > 0 && items.every((i) => open.has(i.id));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            setOpen(allOpen ? new Set() : new Set(items.map((i) => i.id)))
          }
          className="min-h-11 cursor-pointer text-[15px] font-bold text-crimson hover:text-crimson-dark"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="border-t border-line">
        {items.map((item) => {
          const isOpen = open.has(item.id);
          return (
            <li key={item.id} className="border-b border-line">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`q-${item.id}`}
                  onClick={() => toggle(item.id)}
                  className="group grid w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_24px] items-start gap-3 py-5.5 text-left sm:grid-cols-[48px_minmax(0,1fr)_28px] sm:gap-4"
                >
                  <span className="text-[22px] leading-tight font-bold text-crimson">
                    {item.number}
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="text-[19px] leading-snug font-bold group-hover:text-crimson">
                      {item.title}
                    </span>
                    <span className="text-[13px] font-bold tracking-[0.06em] text-ink-3 uppercase">
                      {item.meta}
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                    className="text-crimson"
                  >
                    <path d="M5 12h14" />
                    <path
                      d="M12 5v14"
                      className={`origin-center transition-transform duration-150 ${isOpen ? "scale-y-0" : ""}`}
                    />
                  </svg>
                </button>
              </h3>
              <div
                id={`q-${item.id}`}
                hidden={!isOpen}
                className="pb-6.5 pl-12 sm:pr-11 sm:pl-16"
              >
                {item.content}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
