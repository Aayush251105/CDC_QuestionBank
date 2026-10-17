// 2 px crimson bar at the very top, shown only if loading takes over 300 ms.
// Used by loading.tsx; turned off for "reduce motion" by the global rule.
export function TopLoadingBar() {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left animate-[top-bar_2s_ease-out_300ms_both] bg-crimson"
    />
  );
}
