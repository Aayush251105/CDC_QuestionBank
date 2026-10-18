import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { requireUser } from "@/server/auth";
import { getTopicGroups } from "@/server/queries/topics";

export const metadata: Metadata = {
  title: "Topics · Placement Question Bank",
};

// Page 08. A topic opens Search filtered to it.
export default function TopicsPage() {
  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-11 pb-9">
          <p className="eyebrow">Practise by skill</p>
          <h1 className="text-[34px] leading-[1.1] font-bold sm:text-[42px]">
            Topics
          </h1>
          <p className="max-w-160 text-lg font-light text-ink-2">
            Pick one skill and work through every question on it, newest first,
            with the companies that ask it most.
          </p>
        </div>
      </section>
      <div className="wrap flex flex-col gap-12 pt-11 pb-16">
        <Suspense fallback={<SkeletonRows rows={6} />}>
          <Topics />
        </Suspense>
      </div>
    </>
  );
}

async function Topics() {
  await requireUser();
  const groups = await getTopicGroups();
  return groups.map((g, i) => (
    <section
      key={g.name}
      aria-labelledby={`g-${i}`}
      className="flex flex-col gap-4"
    >
      <div className="flex items-baseline gap-4 border-b-2 border-charcoal pb-2.5">
        <span className="text-sm font-bold text-crimson">
          {String(i + 1).padStart(2, "0")}
        </span>
        <h2 id={`g-${i}`} className="text-[26px] font-bold">
          {g.name}
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] border-t border-l border-line">
        {g.topics.map((t) => (
          <Link
            key={t.slug}
            href={`/search?topic=${t.slug}&sort=newest`}
            className="group flex min-h-27.5 flex-col gap-1 border-r border-b border-line bg-white p-5 text-charcoal no-underline hover:bg-charcoal hover:text-white"
          >
            <span className="flex items-baseline justify-between gap-2">
              <strong className="text-lg">{t.name}</strong>
              <strong className="text-[15px]">{t.count}</strong>
            </span>
            <span className="text-sm text-ink-3 group-hover:text-cream">
              {t.by.length
                ? `Most asked by ${t.by.join(", ")}`
                : "No questions yet"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  ));
}
