"use client";

import { useState, useTransition } from "react";
import {
  changePinDates,
  generateDrivePin,
  logPinCopied,
  setPinEnabled,
} from "@/server/admin/actions/pin";

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";
const confirmBox = "flex flex-col gap-3 border-2 border-charcoal p-5";

// "Generate PIN" on a drive that has none.
export function GeneratePinButton({ driveId }: { driveId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-primary self-start"
      disabled={pending}
      onClick={() => startTransition(() => generateDrivePin(driveId))}
    >
      {pending ? "Generating…" : "Generate PIN"}
    </button>
  );
}

export function CopyPinButton({
  driveId,
  pin,
}: {
  driveId: string;
  pin: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary min-h-9 px-3"
      onClick={async () => {
        await navigator.clipboard.writeText(pin);
        setCopied(true);
        void logPinCopied(driveId);
      }}
    >
      {copied ? "Copied" : "Copy PIN"}
    </button>
  );
}

// Regenerate, Change dates and Switch off / on. Regenerate and Switch off
// ask first, naming what will change (A00a 05).
export function PinActions({
  driveId,
  pin,
  enabled,
  submissions,
  opensAt,
  closesAt,
}: {
  driveId: string;
  pin: string; // formatted
  enabled: boolean;
  submissions: number;
  opensAt: string;
  closesAt: string;
}) {
  const [open, setOpen] = useState<"regen" | "dates" | "off" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5 border-t border-line pt-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen("regen")}
        >
          Regenerate
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen("dates")}
        >
          Change dates
        </button>
        {enabled ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setOpen("off")}
          >
            Switch off
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => startTransition(() => setPinEnabled(driveId, true))}
          >
            Switch on
          </button>
        )}
      </div>

      {open === "regen" && (
        <div role="alertdialog" aria-labelledby="rg-h" className={confirmBox}>
          <h3 id="rg-h" className="text-lg font-bold">
            Regenerate the PIN?
          </h3>
          <p className="text-[15px]">
            {pin} stops working straight away. Students who have not submitted
            yet will need the new PIN. The{" "}
            {submissions === 1 ? "submission" : `${submissions} submissions`}{" "}
            already made keep their tags.
          </p>
          <span className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await generateDrivePin(driveId);
                  setOpen(null);
                })
              }
            >
              {pending ? "Regenerating…" : "Regenerate PIN"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(null)}
            >
              Keep current PIN
            </button>
          </span>
        </div>
      )}

      {open === "off" && (
        <div role="alertdialog" aria-labelledby="off-h" className={confirmBox}>
          <h3 id="off-h" className="text-lg font-bold">
            Switch off the PIN?
          </h3>
          <p className="text-[15px]">
            Nobody can submit to this drive with {pin} until you switch it back
            on. Submissions already made are not affected.
          </p>
          <span className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setPinEnabled(driveId, false);
                  setOpen(null);
                })
              }
            >
              {pending ? "Switching off…" : "Switch off"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(null)}
            >
              Keep it on
            </button>
          </span>
        </div>
      )}

      {open === "dates" && (
        <form
          className={confirmBox}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await changePinDates(
                driveId,
                String(data.get("opens") ?? ""),
                String(data.get("closes") ?? ""),
              );
              setError(result.error);
              if (!result.error) setOpen(null);
            });
          }}
        >
          <h3 className="text-lg font-bold">When the PIN works</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pin-opens" className="lbl">
                Open from
              </label>
              <input
                id="pin-opens"
                name="opens"
                type="date"
                defaultValue={opensAt}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pin-closes" className="lbl">
                Close on
              </label>
              <input
                id="pin-closes"
                name="closes"
                type="date"
                defaultValue={closesAt}
                className={field}
              />
            </div>
          </div>
          {error && <p className="font-bold text-crimson">{error}</p>}
          <span className="flex flex-wrap gap-2.5">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save dates"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(null)}
            >
              Cancel
            </button>
          </span>
        </form>
      )}
    </div>
  );
}

// "Share with the shortlist": a ready-made message to paste into the CDC's
// own email. The app never sends email (CLAUDE.md 2a.2).
export function ShareMessage({
  driveName,
  pin,
  until,
  site,
}: {
  driveName: string;
  pin: string;
  until: string | null;
  site: string; // e.g. https://questions.snu.edu.in
}) {
  const initial = [
    `You are shortlisted for the ${driveName} drive. After each round, please share the questions you remember on the CDC Question Bank.`,
    "",
    `Your drive PIN: ${pin}`,
    `Submit here: ${site}/submit`,
    `${until ? `The PIN works until ${until}. ` : ""}Please do not share it outside the shortlist.`,
  ].join("\n");
  const [message, setMessage] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <label htmlFor="msg" className="lbl">
        Message
      </label>
      <textarea
        id="msg"
        rows={7}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setCopied(false);
        }}
        className="w-full border border-line-strong bg-white px-3.5 py-3 text-[15px] leading-relaxed focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(message);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy message"}
        </button>
        <span className="text-sm text-ink-3">
          Paste it into the shortlist email. The site never sends emails.
        </span>
      </div>
    </>
  );
}
