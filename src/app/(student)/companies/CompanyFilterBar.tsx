"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Name search, year and sort. Every change goes into the URL (replace, so
// typing does not flood the history), which the server page reads.
export function CompanyFilterBar({ years }: { years: number[] }) {
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

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        update("q", q.trim());
      }}
      className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="cq" className="lbl">
          Find a company
        </label>
        <input
          id="cq"
          type="search"
          value={q}
          placeholder="Company name"
          className="field min-h-12 text-base"
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => update("q", value.trim()), 250);
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cy" className="lbl">
          Year
        </label>
        <select
          id="cy"
          className="field min-h-12 text-base"
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
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cs" className="lbl">
          Sort by
        </label>
        <select
          id="cs"
          className="field min-h-12 text-base"
          value={params.get("sort") ?? ""}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="">A to Z</option>
          <option value="questions">Most questions</option>
          <option value="latest">Latest drive</option>
        </select>
      </div>
    </form>
  );
}
