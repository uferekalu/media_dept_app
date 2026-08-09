'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertTriangle, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useGetServicesQuery } from '@/lib/redux/api';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  MediaTeamMemberRole,
  SERVICE_STATUS_COLOR,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  ServiceStatus,
  ServiceType,
} from '@/lib/types/enums';

const ALL_STATUSES = 'ALL_STATUSES';
const ALL_TYPES = 'ALL_TYPES';
const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Service List — brief Section 5 (screen 3): every service regardless of status, the
// entry point this app was missing for reaching a service that hasn't yet moved past
// Planned (the Dashboard's "Live Now" view deliberately excludes Planned/Archived).
export default function ServicesPage() {
  const { data: currentUser } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<ServiceType | null>(null);

  const { data: services, isLoading, isError, error, refetch } = useGetServicesQuery();
  const canCreate = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  const filtered = useMemo(() => {
    return [...(services ?? [])]
      .filter((s) => !statusFilter || s.status === statusFilter)
      .filter((s) => !typeFilter || s.type === typeFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [services, statusFilter, typeFilter]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-lg text-foreground">Services</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Every Sunday Service, Revival, Crusade, and Special Program — planned or past.
          </p>
        </div>
        {canCreate && (
          <Link href="/services/new" className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}>
            <Plus className="size-4" />
            Create service
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Status</Label>
          <Select
            value={statusFilter ?? ALL_STATUSES}
            onValueChange={(v) => setStatusFilter(!v || v === ALL_STATUSES ? null : (v as ServiceStatus))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_STATUSES
                    ? 'All statuses'
                    : SERVICE_STATUS_LABELS[value as ServiceStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {Object.values(ServiceStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {SERVICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Type</Label>
          <Select
            value={typeFilter ?? ALL_TYPES}
            onValueChange={(v) => setTypeFilter(!v || v === ALL_TYPES ? null : (v as ServiceType))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_TYPES ? 'All types' : SERVICE_TYPE_LABELS[value as ServiceType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {Object.values(ServiceType).map((t) => (
                <SelectItem key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load services</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Plus className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No services match these filters</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {canCreate ? 'Create one to get started.' : 'Check back once one is scheduled.'}
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          {filtered.map((service) => (
            <Link
              key={service._id}
              href={`/services/${service._id}`}
              className="flex items-center gap-3 border-b border-border p-3 last:border-0 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{service.name}</p>
                <p className="text-caption truncate text-muted-foreground">
                  {SERVICE_TYPE_LABELS[service.type]} · {format(new Date(service.date), 'MMM d, yyyy')} ·{' '}
                  {service.venue}
                </p>
              </div>
              <Badge variant={SERVICE_STATUS_COLOR[service.status]} size="sm" className="shrink-0">
                {SERVICE_STATUS_LABELS[service.status]}
              </Badge>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
