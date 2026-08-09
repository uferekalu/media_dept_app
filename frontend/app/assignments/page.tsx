'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, RefreshCw, ShieldAlert, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useDeleteCrewAssignmentMutation,
  useGetAllCrewAssignmentsQuery,
  useGetMediaTeamMembersQuery,
  useGetServicesQuery,
} from '@/lib/redux/api';
import { CrewAssignmentStatusActions } from '@/components/crew-assignment-status-actions';
import { CrewReassignControl } from '@/components/crew-reassign-control';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { Service } from '@/lib/types/service';
import {
  CREW_ASSIGNMENT_ROLE_LABELS,
  CREW_ASSIGNMENT_STATUS_BADGE_VARIANT,
  CREW_ASSIGNMENT_STATUS_LABELS,
  MediaTeamMemberRole,
  SERVICE_TYPE_LABELS,
} from '@/lib/types/enums';

const ALL_MEMBERS = 'ALL_MEMBERS';
const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// All Assignments — Admin/Director-only cross-service crew roster. Previously the
// only ways to see a crew assignment were "my own" (/my-assignments) or "one service
// at a time" (/services/[id]/crew, itself only reachable once you already had that
// service's id) — there was no single place to see everything at a glance, even
// though the backend's GET /crew-assignments (list-all) already existed for this
// exact purpose. Also the first place a filled role can be reassigned in one click
// instead of remove-then-recreate (see CrewReassignControl).
export default function AllAssignmentsPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const isElevated = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAllCrewAssignmentsQuery(isElevated ? undefined : skipToken);
  const { data: services } = useGetServicesQuery(isElevated ? undefined : skipToken);
  const { data: members } = useGetMediaTeamMembersQuery(isElevated ? undefined : skipToken);
  const [deleteAssignment, { isLoading: isDeleting }] = useDeleteCrewAssignmentMutation();

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();
    services?.forEach((s) => map.set(s._id, s));
    return map;
  }, [services]);

  const memberById = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => map.set(m._id, m.full_name));
    return map;
  }, [members]);

  const groupedByService = useMemo(() => {
    const filtered = (assignments ?? []).filter(
      (a) => !memberFilter || a.media_team_member === memberFilter,
    );
    const groups = new Map<string, CrewAssignment[]>();
    filtered.forEach((a) => {
      const existing = groups.get(a.service) ?? [];
      existing.push(a);
      groups.set(a.service, existing);
    });
    return [...groups.entries()].sort(([serviceIdA], [serviceIdB]) => {
      const dateA = serviceById.get(serviceIdA)?.date;
      const dateB = serviceById.get(serviceIdB)?.date;
      if (!dateA || !dateB) return 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [assignments, memberFilter, serviceById]);

  async function handleRemove(id: string, serviceId: string, mediaTeamMemberId: string) {
    try {
      await deleteAssignment({ id, serviceId, mediaTeamMemberId }).unwrap();
      toast.success('Assignment removed');
    } catch {
      toast.error('Could not remove this assignment.');
    }
  }

  if (isLoadingUser) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <Skeleton className="h-8 w-1/2 rounded-md" />
      </main>
    );
  }

  if (!isElevated) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <EmptyPanel>
          <IconBadge tone="destructive">
            <ShieldAlert className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Admin/Director access only</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Only Admin and Director can see every crew assignment across every service.
          </p>
        </EmptyPanel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">All Assignments</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Every crew assignment across every service, grouped by service.
        </p>
      </div>

      <div className="mb-4 w-full sm:w-auto">
        <Label className="mb-1.5">Member</Label>
        <Select
          value={memberFilter ?? ALL_MEMBERS}
          onValueChange={(v) => setMemberFilter(!v || v === ALL_MEMBERS ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-48">
            <SelectValue>
              {(value: string | null) =>
                !value || value === ALL_MEMBERS ? 'All members' : (memberById.get(value) ?? 'All members')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MEMBERS}>All members</SelectItem>
            {members?.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load assignments</p>
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

      {!isLoading && !isError && groupedByService.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Users className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No assignments yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {memberFilter ? 'Nothing matches this filter yet.' : 'Assign crew from a service\'s own Crew page.'}
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && groupedByService.length > 0 && (
        <div className="flex flex-col gap-6">
          {groupedByService.map(([serviceId, serviceAssignments]) => {
            const service = serviceById.get(serviceId);
            return (
              <div key={serviceId}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <Link href={`/services/${serviceId}`} className="text-body font-medium text-primary hover:underline">
                    {service?.name ?? 'Unknown service'}
                  </Link>
                  {service && (
                    <p className="text-caption text-muted-foreground">
                      {SERVICE_TYPE_LABELS[service.type]} · {format(new Date(service.date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {serviceAssignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-foreground">
                          {CREW_ASSIGNMENT_ROLE_LABELS[assignment.role]}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {memberById.get(assignment.media_team_member) ?? 'Unknown member'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Badge variant={CREW_ASSIGNMENT_STATUS_BADGE_VARIANT[assignment.status]}>
                          {CREW_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        </Badge>
                        <CrewAssignmentStatusActions assignment={assignment} size="sm" />
                        <CrewReassignControl assignment={assignment} members={members} />
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemove(assignment._id, assignment.service, assignment.media_team_member)}
                          disabled={isDeleting}
                          aria-label={`Remove ${CREW_ASSIGNMENT_ROLE_LABELS[assignment.role]} assignment`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
