"use client";

import { useRouter } from "next/navigation";

// Season picker; the season lives in the URL.
export function SeasonSelect({
  years,
  current,
}: {
  years: { year: number; label: string }[];
  current: number;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Season"
      value={current}
      onChange={(e) =>
        router.replace(`/admin/analytics?season=${e.target.value}`)
      }
      className="min-h-11 w-45 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:outline-none"
    >
      {years.map((y) => (
        <option key={y.year} value={y.year}>
          Season {y.label}
        </option>
      ))}
    </select>
  );
}
