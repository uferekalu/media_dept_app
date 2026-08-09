'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateServiceStatusMutation } from '@/lib/redux/api';
import { SERVICE_STATUS_ACTION_LABELS, VALID_SERVICE_STATUS_TRANSITIONS } from '@/lib/types/enums';
import type { Service } from '@/lib/types/service';

// Shared guarded status-advance control for Services — mirrors social-post-status-
// actions.tsx / broadcast-status-actions.tsx / crew-assignment-status-actions.tsx.
// Used on both the Dashboard's ServiceCard and the Service detail screen so the two
// never drift apart.
export function ServiceStatusActions({ service, size = 'lg' }: { service: Service; size?: 'sm' | 'lg' }) {
  const [updateStatus, { isLoading }] = useUpdateServiceStatusMutation();
  const nextStatuses = VALID_SERVICE_STATUS_TRANSITIONS[service.status];

  async function handleAdvance() {
    try {
      await updateStatus({ id: service._id, status: nextStatuses[0] }).unwrap();
      toast.success(`${service.name}: ${SERVICE_STATUS_ACTION_LABELS[service.status]}`);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update status. Please try again.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Fully archived.</p>;
  }

  return (
    <Button
      size={size === 'lg' ? 'lg' : 'sm'}
      onClick={handleAdvance}
      disabled={isLoading}
      className={size === 'lg' ? 'h-16 w-full text-body font-semibold' : ''}
    >
      {SERVICE_STATUS_ACTION_LABELS[service.status]}
    </Button>
  );
}
