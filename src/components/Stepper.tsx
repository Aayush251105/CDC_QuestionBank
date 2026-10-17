import { STEPS } from "@/lib/submit";

// The 4-part bar on every submit page: Drive, Round, Questions, Review.
// Done steps and the current one fill crimson.
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol
      aria-label="Steps"
      className="mt-3.5 grid max-w-190 grid-cols-4 gap-1.5"
    >
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        return (
          <li
            key={label}
            aria-current={now ? "step" : undefined}
            className="flex flex-col gap-2"
          >
            <span
              className={`h-1 ${done || now ? "bg-crimson" : "bg-[#D4D4D3]"}`}
            />
            <span
              className={`text-sm ${now ? "font-bold text-crimson" : done ? "text-charcoal" : "text-ink-3"}`}
            >
              {n} · {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Grey band at the top of each submit page.
export function SubmitHeader({
  step,
  title,
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
}) {
  return (
    <section className="border-b border-line bg-grey-band">
      <div className="wrap flex flex-col gap-2.5 pt-9 pb-7">
        <p className="eyebrow">Submit an OA · Step {step} of 4</p>
        <h1 className="text-[30px] leading-[1.15] font-bold sm:text-[38px]">
          {title}
        </h1>
        <Stepper current={step} />
      </div>
    </section>
  );
}
