import { formatNaira } from '@/lib/utils';

// Single-series magnitude meter (dataviz skill's Tier 1 pattern, same visual language
// as report-bar-list.tsx) — one brand hue, track a lighter step of the same ramp,
// value direct-labeled since there's no hidden data behind a hover state. Capped at
// 100% width even if current_amount has overshot target_amount slightly (a
// last-minute contribution landing just as the campaign was about to auto-COMPLETE).
export function ContributionProgressMeter({
  currentAmount,
  targetAmount,
}: {
  currentAmount: number;
  targetAmount: number;
}) {
  const pct = Math.min(100, Math.round((currentAmount / targetAmount) * 100));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-full rounded-[4px] bg-primary/10">
        <div className="h-3 rounded-[4px] bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-body-sm font-medium text-foreground">
          {formatNaira(currentAmount)} <span className="text-muted-foreground">raised</span>
        </p>
        <p className="text-caption text-muted-foreground">
          {pct}% of {formatNaira(targetAmount)}
        </p>
      </div>
    </div>
  );
}
