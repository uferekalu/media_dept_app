import { formatNaira } from '@/lib/utils';

// Same Tier-1 "meter" visual language as report-bar-list.tsx (one brand hue, thin
// 12px mark, value direct-labeled) — a dedicated variant since this one's values are
// kobo amounts that need Naira formatting, not raw counts.
export function FundsRaisedBarList({
  items,
  emptyMessage,
}: {
  items: { key: string; label: string; amountKobo: number }[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-body-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.amountKobo), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="w-28 shrink-0 sm:w-36">
            <p className="text-body-sm truncate font-medium text-foreground">{item.label}</p>
          </div>
          <div className="h-3 min-w-0 flex-1 rounded-[4px] bg-primary/10">
            <div
              className="h-3 rounded-r-[4px] bg-primary"
              style={{ width: `${(item.amountKobo / max) * 100}%` }}
            />
          </div>
          <p className="w-24 shrink-0 text-right text-body-sm font-medium tabular-nums text-foreground">
            {formatNaira(item.amountKobo)}
          </p>
        </div>
      ))}
    </div>
  );
}
