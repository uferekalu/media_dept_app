'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useGetContributionCampaignQuery, useGetEquipmentQuery } from '@/lib/redux/api';
import { ContributionProgressMeter } from '@/components/contribution-progress-meter';
import { ContributionCampaignStatusActions } from '@/components/contribution-campaign-status-actions';
import { ContributionContributeForm } from '@/components/contribution-contribute-form';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS,
  CONTRIBUTION_CAMPAIGN_STATUS_BADGE_VARIANT,
  CONTRIBUTION_CAMPAIGN_STATUS_LABELS,
  ContributionCampaignStatus,
  MediaTeamMemberRole,
} from '@/lib/types/enums';

const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Campaign detail + Contribute flow (brief Section 5, screen 15). Any authenticated
// member can contribute while the campaign is ACTIVE; Admin/Director additionally get
// the status-advance controls (Mark Completed / Close Campaign).
export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: currentUser } = useCurrentUser();
  const {
    data: campaign,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetContributionCampaignQuery(id);
  const { data: equipment } = useGetEquipmentQuery();

  const isElevated = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);
  const linkedEquipment = campaign?.equipment ? equipment?.find((e) => e._id === campaign.equipment) : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/campaigns"
        className="text-body-sm mb-4 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to campaigns
      </Link>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3 rounded-md" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this campaign</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && campaign && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-heading-lg text-foreground">{campaign.title}</h1>
                <p className="text-caption text-muted-foreground">
                  {CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS[campaign.purpose_category]}
                  {linkedEquipment ? ` · ${linkedEquipment.name}` : ''}
                </p>
              </div>
              <Badge variant={CONTRIBUTION_CAMPAIGN_STATUS_BADGE_VARIANT[campaign.status]} size="sm">
                {CONTRIBUTION_CAMPAIGN_STATUS_LABELS[campaign.status]}
              </Badge>
            </div>

            {campaign.description && (
              <p className="text-body-sm mb-4 text-muted-foreground">{campaign.description}</p>
            )}

            <ContributionProgressMeter currentAmount={campaign.current_amount} targetAmount={campaign.target_amount} />

            {isElevated && (
              <div className="mt-4 border-t border-border pt-4">
                <ContributionCampaignStatusActions campaign={campaign} />
              </div>
            )}
          </div>

          {campaign.status === ContributionCampaignStatus.ACTIVE && currentUser && (
            <ContributionContributeForm campaignId={campaign._id} />
          )}

          {campaign.status !== ContributionCampaignStatus.ACTIVE && (
            <p className="text-body-sm text-muted-foreground">
              This campaign is {CONTRIBUTION_CAMPAIGN_STATUS_LABELS[campaign.status].toLowerCase()} and is no longer
              accepting contributions.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
