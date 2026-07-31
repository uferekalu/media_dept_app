import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContributionProgressMeter } from '@/components/contribution-progress-meter';
import {
  CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS,
  CONTRIBUTION_CAMPAIGN_STATUS_BADGE_VARIANT,
  CONTRIBUTION_CAMPAIGN_STATUS_LABELS,
} from '@/lib/types/enums';
import type { ContributionCampaign } from '@/lib/types/contribution-campaign';

// One card per ContributionCampaign on the Contribution Campaigns screen (brief
// Section 5, screen 15) — the whole card links to the campaign's detail/Contribute page.
export function ContributionCampaignCard({ campaign }: { campaign: ContributionCampaign }) {
  return (
    <Link
      href={`/campaigns/${campaign._id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">{campaign.title}</p>
          <p className="text-caption text-muted-foreground">
            {CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS[campaign.purpose_category]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={CONTRIBUTION_CAMPAIGN_STATUS_BADGE_VARIANT[campaign.status]} size="sm">
            {CONTRIBUTION_CAMPAIGN_STATUS_LABELS[campaign.status]}
          </Badge>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </div>

      <ContributionProgressMeter currentAmount={campaign.current_amount} targetAmount={campaign.target_amount} />
    </Link>
  );
}
