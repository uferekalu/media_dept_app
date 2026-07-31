'use client';

import { useState } from 'react';
import { AlertTriangle, HandCoins, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useGetContributionCampaignsQuery } from '@/lib/redux/api';
import { ContributionCampaignCreateForm } from '@/components/contribution-campaign-create-form';
import { ContributionCampaignCard } from '@/components/contribution-campaign-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTRIBUTION_CAMPAIGN_STATUS_LABELS, ContributionCampaignStatus, MediaTeamMemberRole } from '@/lib/types/enums';

const ALL_STATUSES = 'ALL_STATUSES';
const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Contribution Campaigns — brief Section 5 (screen 15): every campaign with its live
// progress. Any authenticated member sees the list; only Admin/Director get the
// "Start a campaign" form (backend enforces this too — the form is a convenience,
// not the real gate).
export default function CampaignsPage() {
  const { data: currentUser } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<ContributionCampaignStatus | null>(
    ContributionCampaignStatus.ACTIVE,
  );

  const {
    data: campaigns,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetContributionCampaignsQuery({ status: statusFilter ?? undefined });

  const canCreate = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Contribution Campaigns</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Fund equipment purchases and repairs together.
        </p>
      </div>

      {canCreate && (
        <div className="mb-6">
          <ContributionCampaignCreateForm />
        </div>
      )}

      <div className="mb-4 w-full sm:w-auto">
        <Label className="mb-1.5">Status</Label>
        <Select
          value={statusFilter ?? ALL_STATUSES}
          onValueChange={(v) =>
            setStatusFilter(!v || v === ALL_STATUSES ? null : (v as ContributionCampaignStatus))
          }
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-36">
            <SelectValue>
              {(value: string | null) =>
                !value || value === ALL_STATUSES
                  ? 'All statuses'
                  : CONTRIBUTION_CAMPAIGN_STATUS_LABELS[value as ContributionCampaignStatus]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {Object.values(ContributionCampaignStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {CONTRIBUTION_CAMPAIGN_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load campaigns</p>
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

      {!isLoading && !isError && (campaigns ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <HandCoins className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No campaigns yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {canCreate ? 'Start one above to get funding going.' : 'Check back once one is started.'}
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && (campaigns ?? []).length > 0 && (
        <div className="flex flex-col gap-3">
          {campaigns!.map((campaign) => (
            <ContributionCampaignCard key={campaign._id} campaign={campaign} />
          ))}
        </div>
      )}
    </main>
  );
}
