// Placeholder for the official SNU logo (CLAUDE.md section 5). Keep every
// use of the logo going through this one component so the real artwork can
// replace it in one place. Do not draw an SNU logo here.
export function Wordmark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const onDark = tone === "light";
  return (
    <span className="flex items-center gap-3.5">
      <span
        className={`flex flex-col text-lg leading-[1.05] font-bold tracking-[0.04em] uppercase ${onDark ? "text-white" : "text-charcoal"}`}
      >
        Shiv Nadar
        <span className="mt-1 text-[10px] font-medium tracking-[0.28em]">
          University
        </span>
      </span>
      <span aria-hidden="true" className="h-11 w-0.5 bg-amber" />
      <span
        className={`text-sm leading-[1.3] ${onDark ? "text-cream" : "text-ink-2"}`}
      >
        Career
        <br />
        Development Centre
      </span>
    </span>
  );
}
