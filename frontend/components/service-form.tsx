'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateServiceMutation, useUpdateServiceMutation } from '@/lib/redux/api';
import { SERVICE_TYPE_LABELS, ServiceType } from '@/lib/types/enums';
import type { Service } from '@/lib/types/service';

// Time-of-day inputs are combined with the single Date field to build the
// start_time/end_time ISO datetimes the backend expects — asking for three separate
// raw datetime pickers (date, start, end) would let a service's start_time silently
// land on a different calendar day than its own `date` field.
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toTimeInput(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

// Create/Edit Service (brief Section 5, screens 3-4) — one form for both, keyed off
// whether a `service` is passed in. Admin/Director-only; the page rendering this
// checks the role, the backend's @Roles() guard is the real enforcement.
export function ServiceForm({ service }: { service?: Service }) {
  const router = useRouter();
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const isLoading = isCreating || isUpdating;

  const [name, setName] = useState(service?.name ?? '');
  const [type, setType] = useState<ServiceType | null>(service?.type ?? null);
  const [date, setDate] = useState(service ? toDateInput(service.date) : '');
  const [startTime, setStartTime] = useState(service ? toTimeInput(service.start_time) : '');
  const [endTime, setEndTime] = useState(service ? toTimeInput(service.end_time) : '');
  const [venue, setVenue] = useState(service?.venue ?? '');
  const [speaker, setSpeaker] = useState(service?.speaker ?? '');
  const [series, setSeries] = useState(service?.series ?? '');
  const [description, setDescription] = useState(service?.description ?? '');

  async function handleSubmit() {
    if (!name.trim() || !type || !date || !startTime || !endTime || !venue.trim()) {
      toast.error('Fill in name, type, date, start/end time, and venue first.');
      return;
    }

    const startIso = toIso(date, startTime);
    const endIso = toIso(date, endTime);
    if (endIso <= startIso) {
      toast.error('End time must be after start time.');
      return;
    }

    const body = {
      name: name.trim(),
      type,
      date,
      start_time: startIso,
      end_time: endIso,
      venue: venue.trim(),
      speaker: speaker.trim() || undefined,
      series: series.trim() || undefined,
      description: description.trim() || undefined,
    };

    try {
      if (service) {
        await updateService({ id: service._id, ...body }).unwrap();
        toast.success('Service updated');
        router.push(`/services/${service._id}`);
      } else {
        const created = await createService(body).unwrap();
        toast.success('Service created');
        router.push(`/services/${created._id}`);
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not save this service.');
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <Label className="mb-1.5">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2026 Easter Revival — Day 1"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full sm:w-auto sm:min-w-52">
            <Label className="mb-1.5">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ServiceType)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    value ? SERVICE_TYPE_LABELS[value as ServiceType] : 'Choose a type'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(ServiceType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {SERVICE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <Label className="mb-1.5">Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main Auditorium" />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full sm:w-auto">
            <Label className="mb-1.5">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="w-full sm:w-auto">
            <Label className="mb-1.5">Start time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="w-full sm:w-auto">
            <Label className="mb-1.5">End time</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full">
            <Label className="mb-1.5">Speaker (optional)</Label>
            <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Rev. Dr. John Adebayo" />
          </div>
          <div className="w-full">
            <Label className="mb-1.5">Series (optional)</Label>
            <Input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Faith Series Pt. 3" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="First day of the Easter Revival programme"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} size="lg" className="w-full sm:w-auto">
          {isLoading ? 'Saving…' : service ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </div>
  );
}
