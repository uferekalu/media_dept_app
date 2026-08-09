'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceStatusStepper } from '@/components/service-status-stepper';
import { ServiceStatusActions } from '@/components/service-status-actions';
import { useGetBroadcastsByServiceQuery, useGetPlatformsQuery } from '@/lib/redux/api';
import {
  BROADCAST_STATUS_BADGE_VARIANT,
  BROADCAST_STATUS_LABELS,
  PLATFORM_NAME_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/lib/types/enums';
import type { Service } from '@/lib/types/service';

// Card per service on the Dashboard's "Live Now" view — status stepper (genuinely
// visual, not a bare badge, per frontend/CLAUDE.md) plus a big, unambiguous
// "advance to the next status" action, mirroring protocol_dept_app's
// invitation-card.tsx pattern.
function PlatformStatusBadges({ serviceId }: { serviceId: string }) {
  const { data: broadcasts, isLoading: broadcastsLoading } = useGetBroadcastsByServiceQuery(serviceId);
  const { data: platforms, isLoading: platformsLoading } = useGetPlatformsQuery();

  if (broadcastsLoading || platformsLoading) {
    return <Skeleton className="h-6 w-40" />;
  }

  const enabledPlatforms = (platforms ?? []).filter((p) => p.enabled);
  if (enabledPlatforms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {enabledPlatforms.map((platform) => {
        const broadcast = broadcasts?.find((b) => b.platform === platform._id);
        return (
          <Badge
            key={platform._id}
            variant={broadcast ? BROADCAST_STATUS_BADGE_VARIANT[broadcast.status] : 'archived'}
            size="sm"
          >
            {PLATFORM_NAME_LABELS[platform.name]}
            {broadcast ? `: ${BROADCAST_STATUS_LABELS[broadcast.status]}` : ': Not scheduled'}
          </Badge>
        );
      })}
    </div>
  );
}
export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-heading-md text-foreground">{service.name}</p>
        <p className="text-body-sm text-muted-foreground">
          {SERVICE_TYPE_LABELS[service.type]} &middot; {service.venue}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          {format(new Date(service.date), 'EEEE, MMM d, yyyy')} &middot;{' '}
          {format(new Date(service.start_time), 'h:mm a')} –{' '}
          {format(new Date(service.end_time), 'h:mm a')}
        </p>

        <ServiceStatusStepper status={service.status} />

        <PlatformStatusBadges serviceId={service._id} />

        <ServiceStatusActions service={service} />

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={`/services/${service._id}`}
            className="text-body-sm text-primary hover:underline"
          >
            View details
          </Link>
          <Link
            href={`/services/${service._id}/timeline`}
            className="text-body-sm text-primary hover:underline"
          >
            View timeline
          </Link>
          <Link
            href={`/services/${service._id}/crew`}
            className="text-body-sm text-primary hover:underline"
          >
            Manage crew
          </Link>
          <Link
            href={`/services/${service._id}/broadcasts`}
            className="text-body-sm text-primary hover:underline"
          >
            Manage broadcasts
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
