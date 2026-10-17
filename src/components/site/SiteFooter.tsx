import Link from "next/link";

const links = [
  { href: "/companies", label: "Companies" },
  { href: "/help", label: "Help and FAQ" },
  { href: "/submit", label: "Submit an OA" },
  { href: "/help#honour-code", label: "Honour code" },
  { href: "/me/submissions", label: "My submissions" },
  { href: "/help#contact", label: "Contact the CDC" },
];

export function SiteFooter() {
  return (
    <footer className="bg-charcoal text-cream">
      <div className="wrap flex flex-wrap justify-between gap-8 pt-11 pb-9">
        <div className="flex max-w-105 flex-[1_1_320px] flex-col gap-3">
          <span className="text-[15px] font-bold tracking-[0.08em] text-white uppercase">
            Career Development Centre
          </span>
          <span className="text-sm leading-[1.7] font-light">
            Shiv Nadar Institution of Eminence, Delhi NCR. Questions are shared
            by students who sat the test and checked by the CDC. For SNU
            students only.
          </span>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm font-medium"
        >
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-white no-underline hover:text-white hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/40">
        <div className="wrap py-3.5 text-[13px]">
          © Career Development Centre, Shiv Nadar IoE
        </div>
      </div>
    </footer>
  );
}
