'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useGetBroadcastsByServiceQuery, useGetPlatformsQuery, useGetServiceQuery } from '@/lib/redux/api';
import { BroadcastPlatformSlot } from '@/components/broadcast-platform-slot';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Broadcast management — brief Section 4B/5: schedule and advance a Broadcast per
// Platform for one service. One row per Platform (fill-the-slot, same pattern as the
// Crew Assignment Board) since a (service, platform) pair can only have one
// Broadcast.
export default function ServiceBroadcastsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: service, isLoading: serviceLoading, isError, error, refetch } = useGetServiceQuery(id);
  const { data: broadcasts, isLoading: broadcastsLoading } = useGetBroadcastsByServiceQuery(id);
  const { data: platforms, isLoading: platformsLoading } = useGetPlatformsQuery();

  const isLoading = serviceLoading || broadcastsLoading || platformsLoading;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href={`/services/${id}`}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to service
      </Link>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this service</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This service no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && service && platforms && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-heading-lg text-foreground">{service.name}</h1>
            <p className="text-body-sm text-muted-foreground">Broadcasts</p>
          </div>

          <div className="flex flex-col gap-2">
            {platforms.map((platform) => (
              <BroadcastPlatformSlot
                key={platform._id}
                serviceId={id}
                platform={platform}
                scheduledStartTime={service.start_time}
                broadcast={broadcasts?.find((b) => b.platform === platform._id)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
