import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

// Companies / Amazon / 2025 / Online assessment. The last item is the current page.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap gap-2 text-sm text-ink-2"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {last || !item.href ? (
              <span aria-current={last ? "page" : undefined}>{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-charcoal underline underline-offset-3 hover:text-crimson"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
