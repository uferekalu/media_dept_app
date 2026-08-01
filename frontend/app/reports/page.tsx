'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import {
  useGetContributionCampaignsQuery,
  useGetCrewActivityReportQuery,
  useGetEquipmentUtilizationReportQuery,
  useGetServicesPerMonthReportQuery,
  useGetServicesQuery,
} from '@/lib/redux/api';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { ReportBarList } from '@/components/report-bar-list';
import { FundsRaisedBarList } from '@/components/funds-raised-bar-list';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EQUIPMENT_CATEGORY_LABELS,
  MediaTeamMemberRole,
  SERVICE_STATUS_COLOR,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/lib/types/enums';

// Reports & History — brief Section 5 (screen 14): simple department-wide reports
// (Section 4G) plus a look-back archive of every past service, each linking to its
// full status timeline ("Past services archive with full logs").
export default function ReportsPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === MediaTeamMemberRole.ADMIN;

  const {
    data: servicesPerMonth,
    isLoading: servicesPerMonthLoading,
    isError: servicesPerMonthError,
  } = useGetServicesPerMonthReportQuery();
  const {
    data: crewActivity,
    isLoading: crewActivityLoading,
    isError: crewActivityError,
  } = useGetCrewActivityReportQuery();
  const {
    data: equipmentUtilization,
    isLoading: equipmentUtilizationLoading,
    isError: equipmentUtilizationError,
  } = useGetEquipmentUtilizationReportQuery();
  // Funds Raised (brief Section 4I) is Admin-only, per the brief's stricter split for
  // anything showing contribution amounts — skipped entirely for anyone else so a
  // Director/Member never even fires the request.
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    isError: campaignsError,
  } = useGetContributionCampaignsQuery(isAdmin ? undefined : skipToken);
  const {
    data: services,
    isLoading: servicesLoading,
    isError: servicesError,
    error: servicesQueryError,
    refetch: refetchServices,
  } = useGetServicesQuery();

  const pastServices = useMemo(
    () =>
      [...(services ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [services],
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Reports & History</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Department-wide activity at a glance, and every past service.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-6">
        <ReportSection
          title="Services per Month"
          isLoading={servicesPerMonthLoading}
          isError={servicesPerMonthError}
        >
          <ReportBarList
            emptyMessage="No services recorded yet."
            items={(servicesPerMonth ?? []).map((item) => ({
              key: item.month,
              label: format(new Date(`${item.month}-01`), 'MMM yyyy'),
              value: item.count,
            }))}
          />
        </ReportSection>

        <ReportSection
          title="Most Active Crew"
          isLoading={crewActivityLoading}
          isError={crewActivityError}
        >
          <ReportBarList
            emptyMessage="No completed crew assignments yet."
            items={(crewActivity ?? []).slice(0, 10).map((item) => ({
              key: item.media_team_member_id,
              label: item.full_name,
              value: item.completed_assignments,
            }))}
          />
        </ReportSection>

        <ReportSection
          title="Equipment Utilization"
          isLoading={equipmentUtilizationLoading}
          isError={equipmentUtilizationError}
        >
          <ReportBarList
            emptyMessage="No equipment checkouts yet."
            items={(equipmentUtilization ?? []).slice(0, 10).map((item) => ({
              key: item.equipment_id,
              label: item.name,
              sublabel: EQUIPMENT_CATEGORY_LABELS[item.category],
              value: item.checkout_count,
            }))}
          />
        </ReportSection>

        {isAdmin && (
          <ReportSection title="Funds Raised by Campaign" isLoading={campaignsLoading} isError={campaignsError}>
            <FundsRaisedBarList
              emptyMessage="No campaigns raising funds yet."
              items={[...(campaigns ?? [])]
                .sort((a, b) => b.current_amount - a.current_amount)
                .slice(0, 10)
                .map((c) => ({ key: c._id, label: c.title, amountKobo: c.current_amount }))}
            />
          </ReportSection>
        )}
      </div>

      <div>
        <h2 className="text-heading-md mb-3 text-foreground">Past Services</h2>

        {servicesLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {servicesError && (
          <EmptyPanel>
            <IconBadge tone="destructive">
              <AlertTriangle className="size-7" />
            </IconBadge>
            <p className="text-heading-md text-foreground">Couldn&apos;t load past services</p>
            <p className="text-body-sm max-w-sm text-muted-foreground">
              {servicesQueryError && 'status' in servicesQueryError
                ? `The API returned an error (${servicesQueryError.status}). Check the backend is running.`
                : 'Something went wrong reaching the API.'}
            </p>
            <Button variant="outline" onClick={() => refetchServices()} className="mt-1 gap-1.5">
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </EmptyPanel>
        )}

        {!servicesLoading && !servicesError && pastServices.length === 0 && (
          <p className="text-body-sm text-muted-foreground">No services recorded yet.</p>
        )}

        {!servicesLoading && !servicesError && pastServices.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            {pastServices.map((service) => (
              <Link
                key={service._id}
                href={`/services/${service._id}/timeline`}
                className="flex items-center gap-3 border-b border-border p-3 last:border-0 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{service.name}</p>
                  <p className="text-caption truncate text-muted-foreground">
                    {SERVICE_TYPE_LABELS[service.type]} · {format(new Date(service.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={SERVICE_STATUS_COLOR[service.status]} size="sm" className="shrink-0">
                  {SERVICE_STATUS_LABELS[service.status]}
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ReportSection({
  title,
  isLoading,
  isError,
  children,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-heading-md mb-3 text-foreground">{title}</p>
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      )}
      {isError && <p className="text-body-sm text-destructive">Couldn&apos;t load this report.</p>}
      {!isLoading && !isError && children}
    </div>
  );
}
