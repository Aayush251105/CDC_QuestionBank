"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { Tag } from "@/components/admin/ui";
import {
  createCompany,
  mergeCompany,
  updateCompany,
} from "@/server/admin/actions/companies";

type Row = {
  id: string;
  name: string;
  sector: string | null;
  aliases: string[];
  hidden: boolean;
  fromRequest: boolean;
  drives: number;
  questions: number;
  duplicateOf: string | null;
};

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const th =
  "border-b-2 border-charcoal px-3 py-2.5 text-left text-xs font-bold tracking-[0.08em] text-ink-3 uppercase";
const td = "border-b border-line px-3 py-4 align-top";

// "Add company" form (A10), opened from the page head.
export function AddCompany({ sectors }: { sectors: string[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen(true)}
      >
        Add company
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-end gap-3.5 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await createCompany({
            name: String(data.get("name") ?? ""),
            sector: String(data.get("sector") ?? ""),
            aliases: String(data.get("aliases") ?? ""),
          });
          setError(result.error);
          if (!result.error) setOpen(false);
        });
      }}
    >
      <div className="flex flex-[1_1_220px] flex-col gap-1.5">
        <label htmlFor="c-n" className="lbl">
          Company name
        </label>
        <input id="c-n" name="name" required autoFocus className={field} />
      </div>
      <div className="flex flex-[1_1_160px] flex-col gap-1.5">
        <label htmlFor="c-s" className="lbl">
          Sector
        </label>
        <select id="c-s" name="sector" className={field}>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-[2_1_260px] flex-col gap-1.5">
        <label htmlFor="c-a" className="lbl">
          Aliases, comma separated
        </label>
        <input id="c-a" name="aliases" className={field} />
      </div>
      <span className="flex gap-2.5">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </span>
      {error && <p className="w-full font-bold text-crimson">{error}</p>}
    </form>
  );
}

// Search box; the text lives in the URL.
export function CompanySearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <input
      type="search"
      aria-label="Search companies"
      placeholder="Search companies"
      value={q}
      className={`${field} max-w-95`}
      onChange={(e) => {
        const value = e.target.value;
        setQ(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const v = value.trim();
          router.replace(
            v ? `${pathname}?q=${encodeURIComponent(v)}` : pathname,
            {
              scroll: false,
            },
          );
        }, 250);
      }}
    />
  );
}

// The list, with Edit and Merge opening in place under the row.
export function CompanyTable({
  rows,
  sectors,
  all,
}: {
  rows: Row[];
  sectors: string[];
  all: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<{
    id: string;
    mode: "edit" | "merge";
  } | null>(null);

  if (rows.length === 0)
    return <p className="text-ink-3">No companies match.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th scope="col" className={th}>
              Company
            </th>
            <th scope="col" className={th}>
              Sector
            </th>
            <th scope="col" className={th}>
              Aliases
            </th>
            <th scope="col" className={th}>
              Drives
            </th>
            <th scope="col" className={th}>
              Questions
            </th>
            <th scope="col" className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="hover:bg-grey-band">
                <td className={`${td} font-bold`}>
                  {r.name}
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.hidden && <Tag tone="muted">Hidden</Tag>}
                    {r.fromRequest && (
                      <Tag tone="draft">From a student request</Tag>
                    )}
                  </span>
                  {r.duplicateOf && (
                    <div className="text-[13px] font-bold text-crimson">
                      Possible duplicate of {r.duplicateOf}
                    </div>
                  )}
                </td>
                <td className={`${td} text-sm`}>{r.sector ?? "–"}</td>
                <td className={`${td} text-sm text-ink-3`}>
                  {r.aliases.join(", ")}
                </td>
                <td className={td}>{r.drives}</td>
                <td className={td}>{r.questions}</td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <span className="inline-flex flex-col items-end gap-1.5">
                    <button
                      type="button"
                      className="btn-secondary min-h-9 px-3"
                      onClick={() => setOpen({ id: r.id, mode: "edit" })}
                    >
                      Edit
                    </button>
                    {r.duplicateOf && (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 px-3"
                        onClick={() => setOpen({ id: r.id, mode: "merge" })}
                      >
                        Merge
                      </button>
                    )}
                  </span>
                </td>
              </tr>
              {open?.id === r.id && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-line bg-grey-band p-5"
                  >
                    {open.mode === "edit" ? (
                      <EditCompany
                        row={r}
                        sectors={sectors}
                        onDone={() => setOpen(null)}
                        onMerge={() => setOpen({ id: r.id, mode: "merge" })}
                      />
                    ) : (
                      <MergeCompany
                        row={r}
                        options={all.filter((c) => c.id !== r.id)}
                        onDone={() => setOpen(null)}
                      />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditCompany({
  row,
  sectors,
  onDone,
  onMerge,
}: {
  row: Row;
  sectors: string[];
  onDone: () => void;
  onMerge: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await updateCompany({
            id: row.id,
            name: String(data.get("name") ?? ""),
            sector: String(data.get("sector") ?? ""),
            aliases: String(data.get("aliases") ?? ""),
            hidden: data.get("hidden") === "on",
          });
          setError(result.error);
          if (!result.error) onDone();
        });
      }}
    >
      <div className="flex flex-[1_1_220px] flex-col gap-1.5">
        <label htmlFor={`n-${row.id}`} className="lbl">
          Company name
        </label>
        <input
          id={`n-${row.id}`}
          name="name"
          defaultValue={row.name}
          required
          className={field}
        />
      </div>
      <div className="flex flex-[1_1_160px] flex-col gap-1.5">
        <label htmlFor={`s-${row.id}`} className="lbl">
          Sector
        </label>
        <select
          id={`s-${row.id}`}
          name="sector"
          defaultValue={row.sector ?? ""}
          className={field}
        >
          <option value="">No sector</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-[2_1_260px] flex-col gap-1.5">
        <label htmlFor={`a-${row.id}`} className="lbl">
          Aliases, comma separated
        </label>
        <input
          id={`a-${row.id}`}
          name="aliases"
          defaultValue={row.aliases.join(", ")}
          className={field}
        />
      </div>
      <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          name="hidden"
          defaultChecked={row.hidden}
          className="size-5 accent-crimson"
        />
        <span>
          <strong>Hide from students.</strong> The company and its questions
          disappear from the student site.
        </span>
      </label>
      <span className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="btn-secondary" onClick={onMerge}>
          Merge into another company
        </button>
      </span>
      {error && <p className="w-full font-bold text-crimson">{error}</p>}
    </form>
  );
}

function MergeCompany({
  row,
  options,
  onDone,
}: {
  row: Row;
  options: { id: string; name: string }[];
  onDone: () => void;
}) {
  const suggested = options.find((o) => o.name === row.duplicateOf)?.id;
  const [into, setInto] = useState(suggested ?? options[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const target = options.find((o) => o.id === into)?.name ?? "";
  return (
    <div
      role="alertdialog"
      aria-label={`Merge ${row.name}?`}
      className="flex flex-col gap-3"
    >
      <label htmlFor={`m-${row.id}`} className="lbl">
        Merge {row.name} into
      </label>
      <select
        id={`m-${row.id}`}
        value={into}
        onChange={(e) => setInto(e.target.value)}
        className={`${field} max-w-95`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <p className="text-sm">
        {row.name}&apos;s {row.drives}{" "}
        {row.drives === 1 ? "drive moves" : "drives move"} to {target}, its
        followers follow {target}, and &ldquo;{row.name}&rdquo; becomes one of{" "}
        {target}&apos;s aliases. This cannot be undone here.
      </p>
      {error && <p className="font-bold text-crimson">{error}</p>}
      <span className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || !into}
          onClick={() =>
            startTransition(async () => {
              const result = await mergeCompany(row.id, into);
              setError(result.error);
              if (!result.error) onDone();
            })
          }
        >
          {pending ? "Merging…" : `Merge into ${target}`}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </span>
    </div>
  );
}
