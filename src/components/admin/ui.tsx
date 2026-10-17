import Link from "next/link";
import type { ReactNode } from "react";
import type { PinState } from "@/lib/admin";

// Small building blocks shared by the admin pages (CDC-Portal-Designs/admin).

const tagStyles = {
  draft: "border border-line-strong text-ink-2", // No PIN, Draft, Shortlist
  dark: "bg-charcoal text-white", // PIN generated, Role change, Not found
  pending: "bg-peach text-pending-fg", // Pending review, Likely, Merged
  good: "bg-published-bg text-published-fg", // Active, Open, Verified, Approved
  muted: "bg-unpublished-bg text-ink-2", // Closed, Expired, Not published
} as const;

export type TagTone = keyof typeof tagStyles;

export const pinTone: Record<PinState, TagTone> = {
  "No PIN": "draft",
  Active: "good",
  Off: "muted",
  Expired: "muted",
};

export function Tag({
  tone,
  children,
}: {
  tone: TagTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block px-2.5 py-0.75 text-xs font-bold tracking-[0.06em] whitespace-nowrap uppercase ${tagStyles[tone]}`}
    >
      {children}
    </span>
  );
}

// Grey band at the top of every admin page.
export function PageHead({
  eyebrow,
  title,
  intro,
  actions,
  crumbs,
  tabs,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  crumbs?: ReactNode;
  tabs?: ReactNode; // sits on the bottom edge of the band
}) {
  return (
    <section
      className={`flex flex-col gap-1.5 border-b border-line bg-grey-band px-5 pt-7 sm:px-8 ${tabs ? "" : "pb-7"}`}
    >
      {crumbs}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="text-[34px] leading-[1.15] font-bold">{title}</h1>
          {intro && <p className="max-w-180 text-ink-2">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
      {tabs && <div className="mt-3.5 flex flex-wrap">{tabs}</div>}
    </section>
  );
}

// A tab in a page head: crimson with an underline when selected.
export function TabLink({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`mr-6 inline-flex min-h-11 items-center border-b-3 px-1 text-[15px] font-bold no-underline ${
        selected
          ? "border-crimson text-crimson"
          : "border-transparent text-ink-2 hover:text-crimson"
      }`}
    >
      {children}
    </Link>
  );
}

// Big number with a 2 px rule above it.
export function Kpi({
  value,
  label,
  sub,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t-2 border-charcoal pt-3">
      <b className="text-[34px] leading-[1.1] font-bold">{value}</b>
      <span className="font-bold">{label}</span>
      {sub && <span className="text-[13px] text-ink-3">{sub}</span>}
    </div>
  );
}

// Class names for the plain list tables in the designs.
export const table = {
  wrap: "overflow-x-auto",
  table: "w-full border-collapse text-[15px]",
  th: "border-b-2 border-charcoal px-3 py-2.5 text-left text-xs font-bold tracking-[0.08em] text-ink-3 uppercase",
  td: "border-b border-line px-3 py-4 align-top",
  row: "hover:bg-grey-band",
  rowLink: "font-bold text-charcoal no-underline hover:text-crimson",
};

export function SrOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
