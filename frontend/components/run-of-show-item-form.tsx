'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRunOfShowItemMutation, useUpdateRunOfShowItemMutation } from '@/lib/redux/api';
import type { RunOfShowItem } from '@/lib/types/run-of-show-item';
import type { Service } from '@/lib/types/service';

// Combines the segment's time-of-day with the parent Service's own `date` to build
// scheduled_start_time — same reasoning as service-form.tsx's toIso(): a segment
// picker asking for a full datetime would risk landing on the wrong calendar day.
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function toTimeInput(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

// Add/edit one run-of-show segment (brief Section 4A) — Admin/Director-only, backend-
// enforced. One form for both, keyed off whether `item` is passed in.
export function RunOfShowItemForm({
  service,
  item,
  nextOrder,
  onDone,
}: {
  service: Service;
  item?: RunOfShowItem;
  nextOrder: number;
  onDone?: () => void;
}) {
  const [createItem, { isLoading: isCreating }] = useCreateRunOfShowItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateRunOfShowItemMutation();
  const isLoading = isCreating || isUpdating;

  const [order, setOrder] = useState(String(item?.order ?? nextOrder));
  const [segmentName, setSegmentName] = useState(item?.segment_name ?? '');
  const [time, setTime] = useState(item ? toTimeInput(item.scheduled_start_time) : '');
  const [durationMinutes, setDurationMinutes] = useState(String(item?.duration_minutes ?? ''));
  const [graphicsNotes, setGraphicsNotes] = useState(item?.graphics_notes ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  function resetForm() {
    setOrder(String(nextOrder));
    setSegmentName('');
    setTime('');
    setDurationMinutes('');
    setGraphicsNotes('');
    setNotes('');
  }

  async function handleSubmit() {
    const orderNum = Number(order);
    const durationNum = Number(durationMinutes);
    if (!segmentName.trim() || !time || !(orderNum > 0) || !(durationNum > 0)) {
      toast.error('Fill in an order, segment name, time, and duration above 0 first.');
      return;
    }

    const body = {
      order: orderNum,
      segment_name: segmentName.trim(),
      scheduled_start_time: toIso(service.date, time),
      duration_minutes: durationNum,
      graphics_notes: graphicsNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (item) {
        await updateItem({ id: item._id, serviceId: service._id, ...body }).unwrap();
        toast.success('Segment updated');
      } else {
        await createItem({ service: service._id, ...body }).unwrap();
        toast.success('Segment added');
        resetForm();
      }
      onDone?.();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not save this segment.');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-20">
          <Label className="mb-1.5">#</Label>
          <Input type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>

        <div className="flex-1">
          <Label className="mb-1.5">Segment</Label>
          <Input
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder="Praise & Worship"
          />
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className="w-full sm:w-32">
          <Label className="mb-1.5">Minutes</Label>
          <Input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full">
          <Label className="mb-1.5">Graphics notes (optional)</Label>
          <Input
            value={graphicsNotes}
            onChange={(e) => setGraphicsNotes(e.target.value)}
            placeholder="Lyrics for 3 songs"
          />
        </div>
        <div className="w-full">
          <Label className="mb-1.5">Notes (optional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Worship team leads" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isLoading} size="sm">
          {isLoading ? 'Saving…' : item ? 'Save segment' : 'Add segment'}
        </Button>
        {item && onDone && (
          <Button variant="outline" size="sm" onClick={onDone} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
