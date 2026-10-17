"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Item = { href: string; label: string; badge?: ReactNode };
type Group = { label: string; items: Item[] };

// Left sidebar grouped as in A00a. The current page is marked in crimson.
// Reading the URL happens inside Suspense, like the student NavLinks.
export function AdminNav({
  reviewCount,
  superAdmin,
}: {
  reviewCount: number | null;
  superAdmin: boolean;
}) {
  const badge = reviewCount ? (
    <span
      aria-label={`${reviewCount} waiting`}
      className="min-w-6 bg-crimson px-1.75 py-px text-center text-xs font-bold text-white"
    >
      {reviewCount}
    </span>
  ) : null;
  const groups: Group[] = [
    { label: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
    {
      label: "Drives",
      items: [
        { href: "/admin/drives", label: "Drives" },
        { href: "/admin/review", label: "Review queue", badge },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/admin/questions", label: "Questions" },
        { href: "/admin/companies", label: "Companies" },
      ],
    },
    {
      label: "People",
      items: [{ href: "/admin/students", label: "Students" }],
    },
    {
      label: "Insights",
      items: [
        { href: "/admin/analytics", label: "Analytics and reports" },
        { href: "/admin/audit", label: "Audit log" },
      ],
    },
  ];
  if (superAdmin) {
    groups.push({
      label: "Super admin",
      items: [{ href: "/admin/settings", label: "Admins and settings" }],
    });
  }
  return (
    <Suspense fallback={<Nav groups={groups} pathname={null} />}>
      <ActiveNav groups={groups} />
    </Suspense>
  );
}

function ActiveNav({ groups }: { groups: Group[] }) {
  return <Nav groups={groups} pathname={usePathname()} />;
}

// A drive's review tab counts as the review queue, every other drive page as Drives.
function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/review") {
    return (
      pathname === href || /^\/admin\/drives\/[^/]+\/review/.test(pathname)
    );
  }
  if (
    href === "/admin/drives" &&
    /^\/admin\/drives\/[^/]+\/review/.test(pathname)
  ) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Nav({
  groups,
  pathname,
}: {
  groups: Group[];
  pathname: string | null;
}) {
  return (
    <nav
      aria-label="Admin"
      className="flex flex-[1_1_230px] flex-col border-r border-line bg-grey-band pb-6 md:max-w-62.5"
    >
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col">
          <span className="px-5 pt-4.5 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase">
            {g.label}
          </span>
          {g.items.map((item) => {
            const active = pathname !== null && isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-between border-l-3 pr-5 pl-4.25 text-[15px] no-underline ${
                  active
                    ? "border-crimson bg-white font-bold text-crimson"
                    : "border-transparent font-medium text-charcoal hover:bg-unpublished-bg hover:text-charcoal"
                }`}
              >
                <span>{item.label}</span>
                {item.badge}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
