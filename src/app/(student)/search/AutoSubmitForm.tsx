"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useRef } from "react";

// The filter form for /search. Any checkbox or select change goes straight
// into the URL (empty values left out, so links stay short and shareable).
// Without scripts it is a normal GET form with an "Apply filters" button.
export function AutoSubmitForm({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function apply() {
    if (!ref.current) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(ref.current)) {
      if (typeof value === "string" && value.trim()) params.append(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search", { scroll: false });
  }

  return (
    <Form
      id={id}
      ref={ref}
      action="/search"
      scroll={false}
      className={className}
      onChange={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "SELECT" ||
          (target as HTMLInputElement).type === "checkbox"
        ) {
          apply();
        }
      }}
    >
      {children}
    </Form>
  );
}
