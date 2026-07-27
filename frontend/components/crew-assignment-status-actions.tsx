'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateCrewAssignmentStatusMutation } from '@/lib/redux/api';
import {
  CREW_ASSIGNMENT_STATUS_ACTION_LABELS,
  VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS,
} from '@/lib/types/enums';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { CrewAssignmentStatus } from '@/lib/types/enums';

// Shared guarded status-advance control — used on both the Crew Assignment Board
// (compact, director view) and My Assignments (large touch targets, field use), per
// frontend/CLAUDE.md's mobile-first UX bar. Backend still re-validates every
// transition; this only reflects VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS so the UI
// never offers a move the API would reject. Mirrors protocol_dept_app's
// assignment-status-actions.tsx.
export function CrewAssignmentStatusActions({
  assignment,
  size = 'sm',
}: {
  assignment: CrewAssignment;
  size?: 'sm' | 'lg';
}) {
  const [updateStatus, { isLoading }] = useUpdateCrewAssignmentStatusMutation();
  const nextStatuses = VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS[assignment.status];

  async function handleAdvance(next: CrewAssignmentStatus) {
    try {
      await updateStatus({ id: assignment._id, status: next }).unwrap();
      toast.success(CREW_ASSIGNMENT_STATUS_ACTION_LABELS[next]);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update this assignment.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Completed</p>;
  }

  return (
    <div className={size === 'lg' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size={size === 'lg' ? 'lg' : 'sm'}
          variant={next === 'COMPLETED' ? 'default' : 'outline'}
          onClick={() => handleAdvance(next)}
          disabled={isLoading}
          className={size === 'lg' ? 'h-11 flex-1 text-body font-semibold' : ''}
        >
          {CREW_ASSIGNMENT_STATUS_ACTION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
