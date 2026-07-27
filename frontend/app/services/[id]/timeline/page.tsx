'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  useGetBroadcastsByServiceQuery,
  useGetPlatformsQuery,
  useGetServiceQuery,
  useGetServiceTimelineQuery,
} from '@/lib/redux/api';
import {
  BROADCAST_STATUS_LABELS,
  PLATFORM_NAME_LABELS,
  SERVICE_STATUS_LABELS,
  StatusLogEntityType,
} from '@/lib/types/enums';
import { ServiceCard } from '@/components/service-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Status Timeline — brief Section 5, screen order step 4: the merged Service +
// Broadcast StatusLog history for a service, most recent first (GET
// /services/:id/timeline), plus the same stepper + advance-status action as the
// Dashboard card so a director can act without leaving this screen.
export default function ServiceTimelinePage() {
  const { id } = useParams<{ id: string }>();

  const { data: service, isLoading: serviceLoading, isError, error, refetch } = useGetServiceQuery(id);
  const { data: timeline, isLoading: logsLoading } = useGetServiceTimelineQuery(id);
  const { data: broadcasts } = useGetBroadcastsByServiceQuery(id);
  const { data: platforms } = useGetPlatformsQuery();

  // Resolves a BROADCAST log entry's entity_id back to a human platform name — the
  // log itself only carries the broadcast id, not which platform it was for.
  const platformNameByBroadcastId = useMemo(() => {
    const map = new Map<string, string>();
    broadcasts?.forEach((broadcast) => {
      const platform = platforms?.find((p) => p._id === broadcast.platform);
      if (platform) map.set(broadcast._id, PLATFORM_NAME_LABELS[platform.name]);
    });
    return map;
  }, [broadcasts, platforms]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {(serviceLoading || logsLoading) && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
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

      {service && (
        <div className="flex flex-col gap-6">
          <ServiceCard service={service} />

          <div>
            <h2 className="text-heading-md mb-3 text-foreground">Status timeline</h2>
            {timeline && timeline.length > 0 ? (
              <div className="flex flex-col gap-2">
                {timeline.map((log) => {
                  const isBroadcast = log.entity_type === StatusLogEntityType.BROADCAST;
                  const statusLabel = isBroadcast
                    ? (BROADCAST_STATUS_LABELS[log.status as keyof typeof BROADCAST_STATUS_LABELS] ?? log.status)
                    : (SERVICE_STATUS_LABELS[log.status as keyof typeof SERVICE_STATUS_LABELS] ?? log.status);
                  const sourceLabel = isBroadcast
                    ? (platformNameByBroadcastId.get(log.entity_id) ?? 'Broadcast')
                    : 'Service';

                  return (
                    <div
                      key={log._id}
                      className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-body font-medium text-foreground">
                          <span className="text-muted-foreground">{sourceLabel}:</span> {statusLabel}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {log.notes && (
                        <p className="text-body-sm mt-1 text-muted-foreground">{log.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-sm rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                No status changes recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
