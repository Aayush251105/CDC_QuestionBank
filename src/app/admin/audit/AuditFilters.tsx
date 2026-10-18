"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

const field =
  "min-h-11 border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:outline-none";

// Action type, admin, drive and period; all in the URL so Back restores them.
export function AuditFilters({
  groups,
  admins,
  drives,
  periods,
  period,
}: {
  groups: Option[];
  admins: Option[];
  drives: Option[];
  periods: Option[];
  period: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const select = (
    key: string,
    label: string,
    all: string,
    options: Option[],
    width: string,
  ) => (
    <select
      aria-label={label}
      value={params.get(key) ?? ""}
      onChange={(e) => update(key, e.target.value)}
      className={`${field} ${width}`}
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-wrap gap-3">
      {select("type", "Action type", "All actions", groups, "w-60")}
      {select("admin", "Admin", "All admins", admins, "w-47.5")}
      {select("drive", "Drive", "All drives", drives, "w-70")}
      <select
        aria-label="Period"
        value={period}
        onChange={(e) => update("period", e.target.value)}
        className={`${field} w-40`}
      >
        {periods.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
