'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BroadcastStatusActions } from '@/components/broadcast-status-actions';
import { useCreateBroadcastMutation, useDeleteBroadcastMutation } from '@/lib/redux/api';
import {
  BROADCAST_STATUS_BADGE_VARIANT,
  BROADCAST_STATUS_LABELS,
  PLATFORM_NAME_LABELS,
} from '@/lib/types/enums';
import type { Broadcast } from '@/lib/types/broadcast';
import type { Platform } from '@/lib/types/platform';

// One row per Platform on the Broadcast management screen — mirrors
// crew-role-slot.tsx's fill-the-slot pattern (one Broadcast per (service, platform)
// pair, per the schema's unique index, so this is "empty vs. filled," not a
// free-form list). A disabled platform can't have a broadcast created against it
// (backend/CLAUDE.md) — shown as a disabled state rather than an actionable slot.
export function BroadcastPlatformSlot({
  serviceId,
  platform,
  scheduledStartTime,
  broadcast,
}: {
  serviceId: string;
  platform: Platform;
  scheduledStartTime: string;
  broadcast: Broadcast | undefined;
}) {
  const [createBroadcast, { isLoading: isCreating }] = useCreateBroadcastMutation();
  const [deleteBroadcast, { isLoading: isRemoving }] = useDeleteBroadcastMutation();
  const [removeOpen, setRemoveOpen] = useState(false);

  async function handleCreate() {
    try {
      await createBroadcast({
        service: serviceId,
        platform: platform._id,
        scheduled_start_time: scheduledStartTime,
      }).unwrap();
      toast.success(`${PLATFORM_NAME_LABELS[platform.name]} broadcast scheduled`);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not schedule this broadcast.');
    }
  }

  async function handleRemove() {
    if (!broadcast) return;
    try {
      await deleteBroadcast({ id: broadcast._id, serviceId }).unwrap();
      toast.success('Broadcast removed');
      setRemoveOpen(false);
    } catch {
      toast.error('Could not remove this broadcast.');
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-foreground">{PLATFORM_NAME_LABELS[platform.name]}</p>
        {!platform.enabled && <p className="text-caption text-muted-foreground">Disabled</p>}
        {platform.enabled && !broadcast && (
          <p className="text-caption text-muted-foreground">Not scheduled</p>
        )}
      </div>

      {broadcast ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={BROADCAST_STATUS_BADGE_VARIANT[broadcast.status]}>
            {BROADCAST_STATUS_LABELS[broadcast.status]}
          </Badge>
          <BroadcastStatusActions broadcast={broadcast} size="sm" />
          <Button
            size="icon-sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setRemoveOpen(true)}
            disabled={isRemoving}
            aria-label={`Remove ${PLATFORM_NAME_LABELS[platform.name]} broadcast`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : platform.enabled ? (
        <Button size="sm" onClick={handleCreate} disabled={isCreating}>
          Schedule
        </Button>
      ) : null}

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              The {PLATFORM_NAME_LABELS[platform.name]} broadcast for this service will
              be removed. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
