'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateBroadcastStatusMutation } from '@/lib/redux/api';
import { BROADCAST_STATUS_ACTION_LABELS, VALID_BROADCAST_STATUS_TRANSITIONS } from '@/lib/types/enums';
import type { Broadcast } from '@/lib/types/broadcast';
import type { BroadcastStatus } from '@/lib/types/enums';

// Shared guarded status-advance control for Broadcasts — mirrors
// crew-assignment-status-actions.tsx / protocol_dept_app's AssignmentStatusActions.
// A status change here may trigger the backend's Service rollup (Phase 4); the
// mutation's cache invalidation already covers the Service tags, so nothing extra is
// needed here for that to show up wherever the Service is displayed.
export function BroadcastStatusActions({
  broadcast,
  size = 'sm',
}: {
  broadcast: Broadcast;
  size?: 'sm' | 'lg';
}) {
  const [updateStatus, { isLoading }] = useUpdateBroadcastStatusMutation();
  const nextStatuses = VALID_BROADCAST_STATUS_TRANSITIONS[broadcast.status];

  async function handleAdvance(next: BroadcastStatus) {
    try {
      await updateStatus({ id: broadcast._id, status: next }).unwrap();
      toast.success(BROADCAST_STATUS_ACTION_LABELS[next]);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update this broadcast.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Published</p>;
  }

  return (
    <div className={size === 'lg' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size={size === 'lg' ? 'lg' : 'sm'}
          variant={next === 'ENDED' || next === 'PUBLISHED' ? 'outline' : 'default'}
          onClick={() => handleAdvance(next)}
          disabled={isLoading}
          className={size === 'lg' ? 'h-16 flex-1 text-body font-semibold' : ''}
        >
          {BROADCAST_STATUS_ACTION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
