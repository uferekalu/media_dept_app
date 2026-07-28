'use client';

import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, ClipboardList, RefreshCw, UserRound } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useGetCrewAssignmentsByMediaTeamMemberQuery, useGetServicesQuery } from '@/lib/redux/api';
import { CrewAssignmentStatusActions } from '@/components/crew-assignment-status-actions';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CREW_ASSIGNMENT_ROLE_LABELS,
  CREW_ASSIGNMENT_STATUS_BADGE_VARIANT,
  CREW_ASSIGNMENT_STATUS_LABELS,
} from '@/lib/types/enums';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { Service } from '@/lib/types/service';

// My Assignments — brief Section 5 (screen 6): a personal task list scoped to the
// logged-in member (Phase 7 login, replacing the old "Acting as" header stand-in).
// Mobile-first and large touch targets per frontend/CLAUDE.md's UX bar for field-use
// screens.
export default function MyAssignmentsPage() {
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?._id ?? null;
  const {
    data: assignments,
    isLoading: isLoadingAssignments,
    isError,
    error,
    refetch,
  } = useGetCrewAssignmentsByMediaTeamMemberQuery(currentUserId ?? skipToken);
  const { data: services } = useGetServicesQuery();

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();
    services?.forEach((service) => map.set(service._id, service));
    return map;
  }, [services]);

  const todo = (assignments ?? []).filter((a) => a.status !== 'COMPLETED');
  const completed = (assignments ?? []).filter((a) => a.status === 'COMPLETED');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="text-heading-lg text-foreground">My Assignments</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Your crew assignments across every service currently in the pipeline.
      </p>

      {!currentUserId && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <UserRound className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Not logged in</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Log in from the header to see your assignments.
          </p>
        </EmptyPanel>
      )}

      {currentUserId && isLoadingAssignments && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {currentUserId && isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load your assignments</p>
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

      {currentUserId && !isLoadingAssignments && !isError && (assignments ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <ClipboardList className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No assignments yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Roles assigned to you on the Crew Assignment Board will show up here.
          </p>
        </EmptyPanel>
      )}

      {currentUserId && !isLoadingAssignments && !isError && todo.length > 0 && (
        <div className="flex flex-col gap-3">
          {todo.map((assignment) => (
            <AssignmentTaskCard
              key={assignment._id}
              assignment={assignment}
              service={serviceById.get(assignment.service)}
            />
          ))}
        </div>
      )}

      {currentUserId && !isLoadingAssignments && !isError && completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-heading-md mb-3 text-foreground">Completed</h2>
          <div className="flex flex-col gap-2 opacity-70">
            {completed.map((assignment) => (
              <AssignmentTaskCard
                key={assignment._id}
                assignment={assignment}
                service={serviceById.get(assignment.service)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function AssignmentTaskCard({
  assignment,
  service,
}: {
  assignment: CrewAssignment;
  service?: Service;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-heading-md text-foreground">
            {CREW_ASSIGNMENT_ROLE_LABELS[assignment.role]}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {service ? service.name : 'Service no longer active'}
          </p>
        </div>
        <Badge variant={CREW_ASSIGNMENT_STATUS_BADGE_VARIANT[assignment.status]} className="shrink-0">
          {CREW_ASSIGNMENT_STATUS_LABELS[assignment.status]}
        </Badge>
      </div>

      <p className="text-body-sm mt-2 text-muted-foreground">
        Call time: {new Date(assignment.call_time).toLocaleString()}
      </p>
      {assignment.notes && (
        <p className="text-body-sm mt-1 text-muted-foreground">{assignment.notes}</p>
      )}

      <div className="mt-3">
        <CrewAssignmentStatusActions assignment={assignment} size="lg" />
      </div>
    </div>
  );
}
