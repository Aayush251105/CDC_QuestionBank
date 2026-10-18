"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Kpi, Tag } from "@/components/admin/ui";
import {
  guessColumn,
  mapRows,
  parseCsv,
  type ColumnUse,
} from "@/lib/shortlist";
import {
  importShortlist,
  previewShortlist,
  type ShortlistPreview,
} from "@/server/admin/actions/shortlist";

type Round = { id: string; order: number; name: string; submissions: number };

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const th =
  "border-b-2 border-charcoal px-3 py-2.5 text-left text-xs font-bold tracking-[0.08em] text-ink-3 uppercase";
const td = "border-b border-line px-3 py-4 align-top";

const USE_LABEL: Record<ColumnUse, string> = {
  rollNo: "Roll number",
  email: "SNU email",
  name: "Name",
  ignore: "Ignore",
};

function Step({
  n,
  id,
  children,
}: {
  n: number;
  id: string;
  children: string;
}) {
  return (
    <h2 id={id} className="border-b-2 border-charcoal pb-2 text-xl font-bold">
      <span className="text-crimson">{n}</span> · {children}
    </h2>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

// A06 steps 1 to 3. The CSV is read here in the browser; only the mapped
// rows (roll number, email, name) are sent to the server.
export function ShortlistUploader({
  driveId,
  rounds,
}: {
  driveId: string;
  rounds: Round[];
}) {
  const [roundId, setRoundId] = useState(rounds[0]?.id ?? "");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<string[][]>([]);
  const [uses, setUses] = useState<ColumnUse[]>([]);
  const [preview, setPreview] = useState<ShortlistPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();

  const rows = useMemo(() => mapRows(data, uses), [data, uses]);
  const hasKey = uses.some((u) => u !== "ignore");
  const round = rounds.find((r) => r.id === roundId);

  // Re-check the preview whenever the file or the column choices change.
  useEffect(() => {
    if (!rows.length || !hasKey) return;
    let stale = false;
    startCheck(async () => {
      const result = await previewShortlist(rows);
      if (!stale) setPreview(result);
    });
    return () => {
      stale = true;
    };
  }, [rows, hasKey]);

  async function readFile(f: File) {
    setError(null);
    setPreview(null);
    if (f.size > 5 * 1024 * 1024) {
      setError(
        "That file is over 5 MB. A shortlist CSV should be much smaller.",
      );
      return;
    }
    const parsed = parseCsv(await f.text());
    if (parsed.length < 2) {
      setError("The file needs a header row and at least one student.");
      return;
    }
    setFile({ name: f.name, size: f.size });
    setHeaders(parsed[0]);
    setData(parsed.slice(1));
    setUses(parsed[0].map(guessColumn));
  }

  if (rounds.length === 0) {
    return (
      <p className="text-ink-3">
        This drive has no rounds yet.{" "}
        <Link href={`/admin/drives/${driveId}/edit#rounds`}>Add a round</Link>{" "}
        first; each round has its own shortlist.
      </p>
    );
  }

  return (
    <>
      <section aria-labelledby="u-h" className="flex flex-col gap-3.5">
        <Step n={1} id="u-h">
          Upload the CSV
        </Step>
        <div className="grid items-stretch gap-5 md:grid-cols-[minmax(200px,280px)_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sl-r" className="lbl">
              For round
            </label>
            <select
              id="sl-r"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              className={field}
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {pad(r.order)} · {r.name}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-ink-3">
              One shortlist per round. Uploading again replaces that
              round&apos;s list.
            </span>
          </div>
          <label className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-2 border-dashed border-line-strong p-5.5 focus-within:border-charcoal">
            {file ? (
              <span>
                <strong>{file.name}</strong>
                <span className="block text-sm text-ink-3">
                  {data.length} rows · {headers.length} columns ·{" "}
                  {Math.max(1, Math.round(file.size / 1024))} KB
                </span>
              </span>
            ) : (
              <span>
                <strong>Choose a CSV file</strong>
                <span className="block text-sm text-ink-3">
                  One row per student, with a header row. Save Excel sheets as
                  CSV first.
                </span>
              </span>
            )}
            <span className="btn-secondary min-h-9 px-3">
              {file ? "Choose another file" : "Choose file"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="font-bold text-crimson">
            {error}
          </p>
        )}
      </section>

      {file && (
        <section aria-labelledby="m-h" className="flex flex-col gap-3.5">
          <Step n={2} id="m-h">
            Match the columns
          </Step>
          <p className="text-ink-3">
            We guessed from the headers. Roll number or SNU email is needed for
            matching; names are only a fallback.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    Column in your file
                  </th>
                  <th scope="col" className={th}>
                    Example value
                  </th>
                  <th scope="col" className={th}>
                    Use as
                  </th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td className={`${td} font-mono text-[13px]`}>
                      {h || `Column ${i + 1}`}
                    </td>
                    <td className={`${td} text-sm text-ink-3`}>
                      {data.find((r) => r[i])?.[i] ?? "–"}
                    </td>
                    <td className={td}>
                      <select
                        aria-label={`Use ${h || `column ${i + 1}`} as`}
                        value={uses[i]}
                        onChange={(e) =>
                          setUses((u) =>
                            u.map((x, j) =>
                              j === i ? (e.target.value as ColumnUse) : x,
                            ),
                          )
                        }
                        className={`${field} max-w-60`}
                      >
                        {(Object.keys(USE_LABEL) as ColumnUse[]).map((k) => (
                          <option key={k} value={k}>
                            {USE_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasKey && (
            <p className="font-bold text-crimson">
              Pick at least one column to use as roll number, SNU email or name.
            </p>
          )}
        </section>
      )}

      {file && hasKey && (
        <section
          aria-labelledby="p-h"
          className="flex flex-col gap-3.5"
          aria-busy={checking}
        >
          <Step n={3} id="p-h">
            Check before importing
          </Step>
          {!preview ? (
            <p className="text-ink-3">Checking the rows…</p>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-5">
                <Kpi value={preview.total} label="Rows in the file" />
                <Kpi value={preview.matched} label="Match an SNU account" />
                <Kpi value={preview.nameOnly} label="Matched by name only" />
                <div className="flex flex-col gap-0.5 border-t-2 border-crimson pt-3">
                  <b className="text-[34px] leading-[1.1] font-bold text-crimson">
                    {preview.none}
                  </b>
                  <span className="font-bold">No match</span>
                </div>
              </div>
              {preview.issues.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[15px]">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>
                          Row
                        </th>
                        <th scope="col" className={th}>
                          Roll number
                        </th>
                        <th scope="col" className={th}>
                          Name
                        </th>
                        <th scope="col" className={th}>
                          Email
                        </th>
                        <th scope="col" className={th}>
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.issues.slice(0, 100).map((i) => (
                        <tr key={i.rowNo}>
                          <td className={td}>{i.rowNo}</td>
                          <td className={`${td} font-mono text-[13px]`}>
                            {i.rollNo ?? "—"}
                          </td>
                          <td className={td}>{i.name ?? "—"}</td>
                          <td className={`${td} text-sm`}>{i.email ?? "—"}</td>
                          <td className={td}>
                            <Tag
                              tone={i.result === "NAME" ? "pending" : "dark"}
                            >
                              {i.result === "NAME" ? "Name only" : "No match"}
                            </Tag>
                            <div className="mt-1 text-[13px] text-ink-3">
                              {i.note}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-sm text-ink-3">
                {preview.issues.length > 100
                  ? `Showing the first 100 of ${preview.issues.length} rows that need a look. `
                  : "Only rows that need a look are shown. "}
                Unmatched rows are kept, and match when the list is uploaded
                again after that student has signed in.
              </p>
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
        <Link href={`/admin/drives/${driveId}`} className="btn-secondary">
          Cancel
        </Link>
        {round && round.submissions > 0 && (
          <span className="flex-auto text-right text-sm text-ink-3">
            Existing round {round.order} submissions are re-checked after import
          </span>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={!file || !hasKey || !preview || checking || importing}
          onClick={() =>
            startImport(async () => {
              const result = await importShortlist(
                driveId,
                roundId,
                file!.name,
                rows,
              );
              if (result?.error) setError(result.error);
            })
          }
        >
          {importing ? "Importing…" : `Import ${file ? data.length : ""} rows`}
        </button>
      </div>
    </>
  );
}
