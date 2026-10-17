import Link from "next/link";

// "View all", "All topics": bold crimson link used beside section headings.
export function MoreLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-[15px] font-bold no-underline hover:underline ${className}`}
    >
      {children}
    </Link>
  );
}
