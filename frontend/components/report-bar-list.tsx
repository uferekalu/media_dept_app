// Simple single-series magnitude bars (a "meter" per the dataviz skill's Tier 1
// components, not a full interactive chart) — one brand hue for every bar (this is
// one series, not categorical identity), track a lighter step of the same ramp, thin
// mark (12px, well under the 24px cap), 4px rounded data-end/square baseline, value
// direct-labeled at the tip since there's no hidden data behind a hover state.
export function ReportBarList({
  items,
  emptyMessage,
}: {
  items: { key: string; label: string; sublabel?: string; value: number }[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-body-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="w-28 shrink-0 sm:w-36">
            <p className="text-body-sm truncate font-medium text-foreground">{item.label}</p>
            {item.sublabel && (
              <p className="text-caption truncate text-muted-foreground">{item.sublabel}</p>
            )}
          </div>
          <div className="h-3 min-w-0 flex-1 rounded-[4px] bg-primary/10">
            <div
              className="h-3 rounded-r-[4px] bg-primary"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <p className="w-6 shrink-0 text-right text-body-sm font-medium tabular-nums text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
