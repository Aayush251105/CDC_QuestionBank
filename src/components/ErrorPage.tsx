import Link from "next/link";

// Body of the 404 and 403 pages (design 14).
export function ErrorPage({
  code,
  eyebrow,
  title,
  body,
  action,
  children,
  footer,
}: {
  code: string;
  eyebrow: string;
  title: string;
  body: string;
  action: React.ReactNode;
  children?: React.ReactNode; // above the buttons
  footer?: React.ReactNode; // below the buttons
}) {
  return (
    <div className="wrap grid flex-auto grid-cols-1 content-start items-start gap-10 pt-14 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-14 md:pt-20 md:pb-24">
      <div className="border-t-4 border-crimson pt-4.5">
        <span className="text-[88px] leading-none font-bold tracking-[-0.02em] md:text-[120px]">
          {code}
        </span>
      </div>
      <div className="flex max-w-150 flex-col gap-4">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-[32px] leading-[1.15] font-bold md:text-[38px]">
          {title}
        </h1>
        <p className="text-[17px] text-ink-2">{body}</p>
        {children}
        <div className="mt-2 flex flex-wrap gap-3">
          {action}
          <Link href="/help" className="btn-secondary">
            Get help
          </Link>
        </div>
        {footer}
      </div>
    </div>
  );
}
