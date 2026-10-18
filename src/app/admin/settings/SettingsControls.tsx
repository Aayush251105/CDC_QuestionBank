"use client";

import { useState, useTransition } from "react";
import {
  addAdmin,
  saveSetting,
  setAdminRole,
} from "@/server/admin/actions/settings";
import type { Settings } from "@/server/admin/settings";

const field =
  "min-h-11 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none";

export function AddAdmin({ domain }: { domain: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!open) {
    return (
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        onClick={() => setOpen(true)}
      >
        Add an admin
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 bg-grey-band p-4.5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await addAdmin(
            String(data.get("email") ?? ""),
            data.get("role") === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
          );
          setError(result.error);
          if (!result.error) setOpen(false);
        });
      }}
    >
      <div className="flex flex-[2_1_260px] flex-col gap-1.5">
        <label htmlFor="a-e" className="lbl">
          SNU email
        </label>
        <input
          id="a-e"
          name="email"
          type="email"
          required
          autoFocus
          placeholder={`name@${domain}`}
          className={field}
        />
      </div>
      <div className="flex flex-[1_1_160px] flex-col gap-1.5">
        <label htmlFor="a-r" className="lbl">
          Role
        </label>
        <select id="a-r" name="role" className={field}>
          <option value="ADMIN">CDC admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
      </div>
      <span className="flex gap-2.5">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add"}
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

// Change role and Remove, each confirmed in place.
export function AdminActions({
  userId,
  name,
  role,
  isMe,
}: {
  userId: string;
  name: string;
  role: "ADMIN" | "SUPER_ADMIN";
  isMe: boolean;
}) {
  const [asking, setAsking] = useState<"role" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (isMe) return <span className="text-sm text-ink-3">You</span>;

  const other = role === "ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const run = (to: "STUDENT" | "ADMIN" | "SUPER_ADMIN") =>
    startTransition(async () => {
      const result = await setAdminRole(userId, to);
      setError(result.error);
      if (!result.error) setAsking(null);
    });

  if (asking) {
    return (
      <div className="flex flex-col items-end gap-2 text-left text-sm whitespace-normal">
        <span>
          {asking === "role"
            ? `Make ${name} a ${other === "ADMIN" ? "CDC admin" : "super admin"}?`
            : `Remove ${name} as an admin? They keep their student account.`}
        </span>
        {error && <span className="font-bold text-crimson">{error}</span>}
        <span className="flex gap-2">
          <button
            type="button"
            className="btn-primary min-h-9 px-3"
            disabled={pending}
            onClick={() => run(asking === "role" ? other : "STUDENT")}
          >
            {asking === "role" ? "Change role" : "Remove"}
          </button>
          <button
            type="button"
            className="btn-secondary min-h-9 px-3"
            onClick={() => {
              setAsking(null);
              setError(null);
            }}
          >
            Cancel
          </button>
        </span>
      </div>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        onClick={() => setAsking("role")}
      >
        Change role
      </button>
      <button
        type="button"
        className="btn-secondary min-h-9 px-3"
        onClick={() => setAsking("remove")}
      >
        Remove
      </button>
    </span>
  );
}

function Switch({
  label,
  body,
  on,
  disabled,
  onFlip,
}: {
  label: string;
  body: string;
  on: boolean;
  disabled?: boolean;
  onFlip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-line py-3.5">
      <span className="flex flex-col">
        <strong className="text-[15px]">{label}</strong>
        <span className="text-sm text-ink-3">{body}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onFlip}
        className={`flex h-7.5 w-13 flex-none border border-charcoal p-0.75 disabled:cursor-not-allowed disabled:opacity-50 ${
          on ? "justify-end bg-crimson" : "justify-start bg-white"
        }`}
      >
        <span className={`size-5.5 ${on ? "bg-white" : "bg-charcoal"}`} />
      </button>
    </div>
  );
}

// "Defaults and switches". Each change saves at once.
export function SettingsForm({ settings }: { settings: Settings }) {
  const [s, setS] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save<K extends keyof Settings>(key: K, value: Settings[K]) {
    const before = s[key];
    setS((x) => ({ ...x, [key]: value }));
    startTransition(async () => {
      const result = await saveSetting(key, value);
      setError(result.error);
      if (result.error) setS((x) => ({ ...x, [key]: before }));
    });
  }

  return (
    <div className="flex flex-col" aria-busy={pending}>
      <Switch
        label="New drives require a PIN"
        body="Sets the default on the New drive form. Admins can still turn it off per drive."
        on={s.requirePinDefault}
        onFlip={() => save("requirePinDefault", !s.requirePinDefault)}
      />
      <Switch
        label="AI cleanup and topic tags"
        body="When off, students see their own text only and admins tag topics by hand. Takes effect when the AI module is built."
        on={s.aiCleanup}
        onFlip={() => save("aiCleanup", !s.aiCleanup)}
      />
      <Switch
        label="Scan uploads"
        body="When off, students can only type their questions. Takes effect when scan upload is built."
        on={s.scanUploads}
        onFlip={() => save("scanUploads", !s.scanUploads)}
      />
      <Switch
        label="Mock interviewer (pilot)"
        body="Not built yet. Reserved for a later phase."
        on={false}
        disabled
      />
      <div className="mt-3.5 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-w" className="lbl">
            PIN works for, after the last round
          </label>
          <select
            id="p-w"
            value={s.pinWindowDays}
            onChange={(e) => save("pinWindowDays", Number(e.target.value))}
            className={field}
          >
            <option value={14}>14 days</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-t" className="lbl">
            Wrong PIN tries before a pause
          </label>
          <select
            id="p-t"
            value={s.pinTries}
            onChange={(e) => save("pinTries", e.target.value)}
            className={field}
          >
            <option value="5/15">5 tries, 15 minutes</option>
            <option value="3/30">3 tries, 30 minutes</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="u-c" className="lbl">
            Scan pages per student per day
          </label>
          <input
            id="u-c"
            type="number"
            min={1}
            max={200}
            defaultValue={s.scanDailyCap}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (n !== s.scanDailyCap) save("scanDailyCap", n);
            }}
            className={field}
          />
        </div>
      </div>
      {error && <p className="mt-3 font-bold text-crimson">{error}</p>}
    </div>
  );
}
