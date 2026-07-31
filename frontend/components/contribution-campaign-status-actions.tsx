'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateContributionCampaignStatusMutation } from '@/lib/redux/api';
import {
  CONTRIBUTION_CAMPAIGN_STATUS_ACTION_LABELS,
  VALID_CONTRIBUTION_CAMPAIGN_STATUS_TRANSITIONS,
} from '@/lib/types/enums';
import type { ContributionCampaign } from '@/lib/types/contribution-campaign';
import type { ContributionCampaignStatus } from '@/lib/types/enums';

// Guarded status-advance control for ContributionCampaigns — mirrors
// social-post-status-actions.tsx. Admin/Director-only; the page that renders this
// checks the role, the backend's @Roles() guard is the real enforcement.
export function ContributionCampaignStatusActions({ campaign }: { campaign: ContributionCampaign }) {
  const [updateStatus, { isLoading }] = useUpdateContributionCampaignStatusMutation();
  const nextStatuses = VALID_CONTRIBUTION_CAMPAIGN_STATUS_TRANSITIONS[campaign.status];

  async function handleAdvance(next: ContributionCampaignStatus) {
    try {
      await updateStatus({ id: campaign._id, status: next }).unwrap();
      toast.success(CONTRIBUTION_CAMPAIGN_STATUS_ACTION_LABELS[next]);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update this campaign.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Closed</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === 'CLOSED' ? 'outline' : 'default'}
          onClick={() => handleAdvance(next)}
          disabled={isLoading}
        >
          {CONTRIBUTION_CAMPAIGN_STATUS_ACTION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
