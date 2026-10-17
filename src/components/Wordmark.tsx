import Image from "next/image";

// The official SNU logo (public/brand), an amber divider and the site name.
// Every use of the logo goes through this one component.
// tone="dark" = blue logo for white backgrounds; "light" = white logo for charcoal.
export function Wordmark({
  tone = "dark",
  title,
  subtitle,
}: {
  tone?: "dark" | "light";
  title: string;
  subtitle?: string;
}) {
  const onDark = tone === "light";
  return (
    <span className="flex items-center gap-3.5">
      <Image
        src={onDark ? "/brand/snu-logo-white.svg" : "/brand/snu-logo.svg"}
        alt="Shiv Nadar University"
        width={500}
        height={172}
        priority
        unoptimized
        className="h-11 w-auto sm:h-12"
      />
      <span aria-hidden="true" className="h-11 w-0.5 shrink-0 bg-amber" />
      <span className="flex flex-col leading-tight">
        <span
          className={`text-base font-bold ${onDark ? "text-white" : "text-charcoal"}`}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className={`text-[13px] ${onDark ? "text-cream" : "text-ink-3"}`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
