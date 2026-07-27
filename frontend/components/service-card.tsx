'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceStatusStepper } from '@/components/service-status-stepper';
import { useUpdateServiceStatusMutation } from '@/lib/redux/api';
import {
  SERVICE_STATUS_ACTION_LABELS,
  SERVICE_TYPE_LABELS,
  VALID_SERVICE_STATUS_TRANSITIONS,
} from '@/lib/types/enums';
import type { Service } from '@/lib/types/service';

// Card per service on the Dashboard's "Live Now" view — status stepper (genuinely
// visual, not a bare badge, per frontend/CLAUDE.md) plus a big, unambiguous
// "advance to the next status" action, mirroring protocol_dept_app's
// invitation-card.tsx pattern. No per-platform broadcast breakdown yet (Phase 4) —
// that slots in here later.
export function ServiceCard({ service }: { service: Service }) {
  const [updateStatus, { isLoading: isUpdating }] = useUpdateServiceStatusMutation();
  const nextStatuses = VALID_SERVICE_STATUS_TRANSITIONS[service.status];

  async function handleAdvance(next: (typeof nextStatuses)[number]) {
    try {
      await updateStatus({ id: service._id, status: next }).unwrap();
      toast.success(`${service.name}: ${SERVICE_STATUS_ACTION_LABELS[service.status]}`);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update status. Please try again.');
    }
  }

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

        {nextStatuses.length > 0 ? (
          // Full-width, real touch target (h-11 = 44px) — per frontend/CLAUDE.md's
          // "big, unambiguous primary actions" and mobile-first status-update UX.
          <Button
            size="lg"
            onClick={() => handleAdvance(nextStatuses[0])}
            disabled={isUpdating}
            className="h-16 text-heading-md"
          >
            {SERVICE_STATUS_ACTION_LABELS[service.status]}
          </Button>
        ) : (
          <p className="text-caption text-muted-foreground">Fully archived.</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1">
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
        </div>
      </CardContent>
    </Card>
  );
}
