"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/companies", label: "Companies" },
  { href: "/topics", label: "Topics" },
  { href: "/search", label: "Search" },
  { href: "/me/bookmarks", label: "Bookmarks" },
  { href: "/me/submissions", label: "My submissions" },
];

// Bold links that turn crimson with an underline when their section is open.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex flex-wrap items-center gap-x-7 pb-3 lg:pb-0"
    >
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 py-3 text-[15px] font-bold no-underline lg:pt-6 lg:pb-5.5 ${
              active
                ? "border-crimson text-crimson"
                : "border-transparent text-charcoal hover:border-crimson hover:text-crimson"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link href="/submit" className="btn-primary my-1.5">
        Submit OA
      </Link>
    </nav>
  );
}
