"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Company filter and year. Changes go into the URL (replace), so Back
// restores the view and links can be shared (A00a 05).
export function DriveFilters({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const field =
    "min-h-11 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        update("q", q.trim());
      }}
      className="flex flex-wrap gap-3"
    >
      <input
        type="search"
        aria-label="Filter drives"
        placeholder="Filter by company"
        value={q}
        className={`${field} max-w-90 flex-[1_1_260px]`}
        onChange={(e) => {
          const value = e.target.value;
          setQ(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => update("q", value.trim()), 250);
        }}
      />
      <select
        aria-label="Year"
        className={`${field} w-35`}
        value={params.get("year") ?? ""}
        onChange={(e) => update("year", e.target.value)}
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </form>
  );
}
