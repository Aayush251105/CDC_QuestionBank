// Grey placeholder rows in the shape of a list while it loads.
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-line py-4">
          <span className="h-4.5 w-3/4 bg-grey-band" />
          <span className="h-3.5 w-1/3 bg-grey-band" />
        </div>
      ))}
    </div>
  );
}
