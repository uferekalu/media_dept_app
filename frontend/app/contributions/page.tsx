'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useGetContributionCampaignsQuery,
  useGetContributionsQuery,
  useGetMediaTeamMembersQuery,
} from '@/lib/redux/api';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
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
import { formatNaira } from '@/lib/utils';
import {
  CONTRIBUTION_PROVIDER_LABELS,
  CONTRIBUTION_STATUS_BADGE_VARIANT,
  CONTRIBUTION_STATUS_LABELS,
  ContributionProvider,
  ContributionStatus,
  MediaTeamMemberRole,
} from '@/lib/types/enums';

const ALL_CAMPAIGNS = 'ALL_CAMPAIGNS';
const ALL_STATUSES = 'ALL_STATUSES';
const ALL_PROVIDERS = 'ALL_PROVIDERS';

// Contributions Ledger — brief Section 5 (screen 16), Admin-only: "the only screen
// showing who gave how much," stricter than every other Admin/Director split in this
// app. A Director or Member never even fires the GET /contributions request — the
// backend would 403 it anyway, but there's no reason to try.
export default function ContributionsLedgerPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const isAdmin = currentUser?.role === MediaTeamMemberRole.ADMIN;

  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContributionStatus | null>(null);
  const [providerFilter, setProviderFilter] = useState<ContributionProvider | null>(null);

  const {
    data: contributions,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetContributionsQuery(
    isAdmin
      ? {
          campaign: campaignFilter ?? undefined,
          status: statusFilter ?? undefined,
          provider: providerFilter ?? undefined,
        }
      : skipToken,
  );
  const { data: campaigns } = useGetContributionCampaignsQuery(isAdmin ? undefined : skipToken);
  const { data: members } = useGetMediaTeamMembersQuery(isAdmin ? undefined : skipToken);

  const campaignById = useMemo(() => {
    const map = new Map<string, string>();
    campaigns?.forEach((c) => map.set(c._id, c.title));
    return map;
  }, [campaigns]);

  const memberById = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => map.set(m._id, m.full_name));
    return map;
  }, [members]);

  const totalRaised = useMemo(
    () =>
      (contributions ?? [])
        .filter((c) => c.status === ContributionStatus.SUCCESSFUL)
        .reduce((sum, c) => sum + c.amount, 0),
    [contributions],
  );

  if (isLoadingUser) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Skeleton className="h-8 w-1/2 rounded-md" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <EmptyPanel>
          <IconBadge tone="destructive">
            <ShieldAlert className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Admin access only</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            The Contributions Ledger shows who gave how much — only an Admin can view it.
          </p>
        </EmptyPanel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Contributions Ledger</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Every contribution, its gateway, and its status.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Campaign</Label>
          <Select
            value={campaignFilter ?? ALL_CAMPAIGNS}
            onValueChange={(v) => setCampaignFilter(!v || v === ALL_CAMPAIGNS ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-44">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_CAMPAIGNS ? 'All campaigns' : (campaignById.get(value) ?? 'All campaigns')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CAMPAIGNS}>All campaigns</SelectItem>
              {campaigns?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Status</Label>
          <Select
            value={statusFilter ?? ALL_STATUSES}
            onValueChange={(v) => setStatusFilter(!v || v === ALL_STATUSES ? null : (v as ContributionStatus))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-36">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_STATUSES
                    ? 'All statuses'
                    : CONTRIBUTION_STATUS_LABELS[value as ContributionStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {Object.values(ContributionStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {CONTRIBUTION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Gateway</Label>
          <Select
            value={providerFilter ?? ALL_PROVIDERS}
            onValueChange={(v) => setProviderFilter(!v || v === ALL_PROVIDERS ? null : (v as ContributionProvider))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-36">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_PROVIDERS
                    ? 'All gateways'
                    : CONTRIBUTION_PROVIDER_LABELS[value as ContributionProvider]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROVIDERS}>All gateways</SelectItem>
              {Object.values(ContributionProvider).map((p) => (
                <SelectItem key={p} value={p}>
                  {CONTRIBUTION_PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && !isError && (
        <p className="text-body-sm mb-4 text-muted-foreground">
          <span className="font-medium text-foreground">{formatNaira(totalRaised)}</span> raised across{' '}
          {(contributions ?? []).filter((c) => c.status === ContributionStatus.SUCCESSFUL).length} successful
          contribution(s) shown below.
        </p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the ledger</p>
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

      {!isLoading && !isError && (contributions ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Wallet className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No contributions yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Nothing matches these filters yet.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && (contributions ?? []).length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          {contributions!.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-3 border-b border-border p-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {memberById.get(c.contributor) ?? 'Unknown member'}
                </p>
                <p className="text-caption truncate text-muted-foreground">
                  {campaignById.get(c.campaign) ?? 'Unknown campaign'} · {CONTRIBUTION_PROVIDER_LABELS[c.provider]} ·{' '}
                  {format(new Date(c.createdAt), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
              <p className="text-body-sm shrink-0 font-medium tabular-nums text-foreground">
                {formatNaira(c.amount)}
              </p>
              <Badge variant={CONTRIBUTION_STATUS_BADGE_VARIANT[c.status]} size="sm" className="shrink-0">
                {CONTRIBUTION_STATUS_LABELS[c.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
