'use client';

import { Radio, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGetLiveNowServicesQuery } from '@/lib/redux/api';
import { ServiceCard } from '@/components/service-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// "Live Now" — the live dashboard, brief Section 4B / 5 (screen 1). Shows every
// service currently active in the production pipeline (past PLANNED, short of
// ARCHIVED — see backend/CLAUDE.md's GET /services/live-now). Per-platform broadcast
// badges and crew-on-duty info join this screen in Phases 3-4.
export default function Home() {
  const { data: services, isLoading, isError, error, refetch } = useGetLiveNowServicesQuery();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mb-8">
        <div>
          <h1 className="text-heading-lg text-foreground">Live Now</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Every service currently in production or distribution, and what needs to
            happen next.
          </p>
        </div>
        {!isLoading && !isError && services && services.length > 0 && (
          <Badge>{services.length} active</Badge>
        )}
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the dashboard</p>
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

      {!isLoading && !isError && services && services.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Radio className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Nothing in production right now</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Services show up here once crew is assigned, and stay until they&apos;re
            fully archived.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && services && services.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
