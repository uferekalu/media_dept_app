'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useGetCrewAssignmentsByServiceQuery,
  useGetMediaTeamMembersQuery,
  useGetServiceQuery,
} from '@/lib/redux/api';
import { CrewRoleSlot } from '@/components/crew-role-slot';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CREW_ASSIGNMENT_ROLE_ORDER, MediaTeamMemberRole } from '@/lib/types/enums';

const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Crew Assignment Board — brief Section 5 (screen 5): fill each of the 8 fixed crew
// roles for one service with a media team member. New call_time assignments default
// to the service's own start_time (fine-tuning a specific call_time ahead of the
// service's start is a later polish item, not required for the core flow). Reading is
// open to any authenticated role (per backend/CLAUDE.md's Crew Assignments section —
// anyone should be able to see who's on the crew), but assigning/reassigning/removing
// is Admin/Director-only; CrewRoleSlot is told isElevated + the viewer's own id so it
// can hide (not just disable) those controls for a Member instead of presenting
// actions that would 403.
export default function CrewAssignmentBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: currentUser } = useCurrentUser();
  const isElevated = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  const { data: service, isLoading: serviceLoading, isError, error, refetch } = useGetServiceQuery(id);
  const { data: assignments, isLoading: assignmentsLoading } = useGetCrewAssignmentsByServiceQuery(id);
  const { data: members } = useGetMediaTeamMembersQuery();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href={`/services/${id}`}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to service
      </Link>

      {(serviceLoading || assignmentsLoading) && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this service</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This service no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {service && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-heading-lg text-foreground">{service.name}</h1>
            <p className="text-body-sm text-muted-foreground">Crew Assignment Board</p>
          </div>

          <div className="flex flex-col gap-2">
            {CREW_ASSIGNMENT_ROLE_ORDER.map((role) => (
              <CrewRoleSlot
                key={role}
                serviceId={id}
                role={role}
                callTime={service.start_time}
                assignment={assignments?.find((a) => a.role === role)}
                members={members}
                isElevated={isElevated}
                currentUserId={currentUser?._id}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
