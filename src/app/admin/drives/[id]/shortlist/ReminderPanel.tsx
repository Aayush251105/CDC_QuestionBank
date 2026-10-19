"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendReminders } from "@/server/admin/actions/reminders";

type Pending = {
  email: string;
  name: string | null;
  rollNo: string | null;
  hasAccount: boolean;
  reminders: number;
  lastReminded: string | null; // "3 days ago", "Never"
};

const field =
  "w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const th =
  "border-b-2 border-charcoal px-3 py-2.5 text-left text-xs font-bold tracking-[0.08em] text-ink-3 uppercase";
const td = "border-b border-line px-3 py-3 align-top text-sm";

// "Not submitted yet": shortlisted students who have not shared questions
// for the round, and one button to email them all a reminder (BCC).
export function ReminderPanel({
  driveId,
  roundId,
  rounds,
  pending,
  noEmail,
  submitted,
  mailEnabled,
  mailFrom,
  defaultSubject,
  defaultText,
}: {
  driveId: string;
  roundId: string;
  rounds: { id: string; label: string }[];
  pending: Pending[];
  noEmail: number;
  submitted: number;
  mailEnabled: boolean;
  mailFrom: string | null;
  defaultSubject: string;
  defaultText: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState(defaultText);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<{
    error: string | null;
    sent: number;
  } | null>(null);
  const [pendingSend, startTransition] = useTransition();
  const n = pending.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rm-round" className="lbl">
            For round
          </label>
          <select
            id="rm-round"
            value={roundId}
            onChange={(e) =>
              router.replace(
                `/admin/drives/${driveId}/shortlist?remind=${e.target.value}#remind`,
                {
                  scroll: false,
                },
              )
            }
            className={`${field} min-h-11 min-w-65`}
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-ink-3">
          {submitted} submitted ·{" "}
          <strong className="text-charcoal">{n} not yet</strong>
          {noEmail > 0 && ` · ${noEmail} without an email address`}
        </p>
      </div>

      {n === 0 ? (
        <p className="text-ink-3">
          Everyone on this round&apos;s shortlist has submitted.
        </p>
      ) : (
        <>
          <div className="max-h-90 overflow-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    Student
                  </th>
                  <th scope="col" className={th}>
                    Email
                  </th>
                  <th scope="col" className={th}>
                    Reminders
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.email}>
                    <td className={td}>
                      <strong>{p.name ?? "Name not given"}</strong>
                      <div className="text-[13px] text-ink-3">
                        {[p.rollNo, !p.hasAccount && "has not signed in yet"]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className={td}>{p.email}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {p.reminders === 0
                        ? "None yet"
                        : `${p.reminders} · last ${p.lastReminded}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="rm-subject" className="lbl">
              Subject
            </label>
            <input
              id="rm-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${field} min-h-11`}
            />
            <label htmlFor="rm-text" className="lbl">
              Message
            </label>
            <textarea
              id="rm-text"
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${field} py-3 leading-relaxed`}
            />
          </div>

          {!mailEnabled && (
            <p className="bg-peach px-4 py-3 text-sm">
              <strong>Gmail is not set up yet.</strong> Add GMAIL_USER and
              GMAIL_APP_PASSWORD to the server settings (.env) to send
              reminders.
            </p>
          )}

          {asking ? (
            <div
              role="alertdialog"
              aria-label="Send the reminder?"
              className="flex flex-col gap-3 border-2 border-charcoal p-4"
            >
              <span className="text-[15px]">
                <strong>
                  Email {n} {n === 1 ? "student" : "students"}?
                </strong>{" "}
                It goes from {mailFrom ?? "the CDC Gmail"} with everyone in BCC,
                so nobody sees the other addresses.
              </span>
              <span className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pendingSend}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await sendReminders(
                        driveId,
                        roundId,
                        subject,
                        text,
                      );
                      setResult(r);
                      setAsking(false);
                    })
                  }
                >
                  {pendingSend ? "Sending…" : "Send reminder"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAsking(false)}
                >
                  Cancel
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary self-start"
              disabled={!mailEnabled}
              onClick={() => {
                setResult(null);
                setAsking(true);
              }}
            >
              Email reminder to {n} {n === 1 ? "student" : "students"}
            </button>
          )}
        </>
      )}

      {result && (
        <p
          role="status"
          className={result.error ? "font-bold text-crimson" : "font-bold"}
        >
          {result.error ??
            `Reminder sent to ${result.sent} ${result.sent === 1 ? "student" : "students"}.`}
        </p>
      )}
    </div>
  );
}
