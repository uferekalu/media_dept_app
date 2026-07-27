'use client';

import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, ClipboardList, RefreshCw, UserRound } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
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

// My Assignments — brief Section 5 (screen 6): a personal task list scoped to
// whoever is picked in the header's "Acting as" stand-in (see acting-as-picker.tsx),
// mirroring protocol_dept_app's own pre-auth My Assignments exactly — replace the
// picker with a real logged-in identity once Phase 7 lands. Mobile-first and large
// touch targets per frontend/CLAUDE.md's UX bar for field-use screens.
export default function MyAssignmentsPage() {
  const actingAsId = useAppSelector((state) => state.session.actingAsId);
  const {
    data: assignments,
    isLoading: isLoadingAssignments,
    isError,
    error,
    refetch,
  } = useGetCrewAssignmentsByMediaTeamMemberQuery(actingAsId ?? skipToken);
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

      {!actingAsId && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <UserRound className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No one selected</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Pick yourself from the &quot;Acting as&quot; menu in the header to see your
            assignments.
          </p>
        </EmptyPanel>
      )}

      {actingAsId && isLoadingAssignments && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {actingAsId && isError && (
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

      {actingAsId && !isLoadingAssignments && !isError && (assignments ?? []).length === 0 && (
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

      {actingAsId && !isLoadingAssignments && !isError && todo.length > 0 && (
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

      {actingAsId && !isLoadingAssignments && !isError && completed.length > 0 && (
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
