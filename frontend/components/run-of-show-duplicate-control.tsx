'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDuplicateRunOfShowMutation, useGetServicesQuery } from '@/lib/redux/api';
import { SERVICE_TYPE_LABELS } from '@/lib/types/enums';

// "Duplicate a previous service's run-of-show as a starting template" (brief Section
// 4A, e.g. a standard Sunday order of service). Only makes sense while this service
// has no segments yet — the backend rejects duplicating onto an already-populated
// target — so the page only renders this when the current list is empty.
export function RunOfShowDuplicateControl({ targetServiceId }: { targetServiceId: string }) {
  const { data: services } = useGetServicesQuery();
  const [duplicate, { isLoading }] = useDuplicateRunOfShowMutation();
  const [sourceId, setSourceId] = useState<string | null>(null);

  const candidates = (services ?? []).filter((s) => s._id !== targetServiceId);

  async function handleDuplicate() {
    if (!sourceId) {
      toast.error('Choose a service to copy from first.');
      return;
    }
    try {
      await duplicate({ source_service: sourceId, target_service: targetServiceId }).unwrap();
      toast.success('Run-of-show copied');
      setSourceId(null);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not duplicate that run-of-show.');
    }
  }

  if (candidates.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
      <p className="text-body-sm text-muted-foreground">
        Start from another service&apos;s run-of-show as a template instead of building from scratch.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-full sm:min-w-56">
            <SelectValue>
              {(value: string | null) => {
                const s = candidates.find((c) => c._id === value);
                return s ? `${s.name} (${SERVICE_TYPE_LABELS[s.type]})` : 'Choose a service to copy';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {candidates.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name} ({SERVICE_TYPE_LABELS[s.type]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleDuplicate} disabled={isLoading} variant="outline" className="shrink-0">
          {isLoading ? 'Copying…' : 'Duplicate as template'}
        </Button>
      </div>
    </div>
  );
}
