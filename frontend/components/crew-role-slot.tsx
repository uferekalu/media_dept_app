'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { CrewAssignmentStatusActions } from '@/components/crew-assignment-status-actions';
import { CrewReassignControl } from '@/components/crew-reassign-control';
import { useCreateCrewAssignmentMutation, useDeleteCrewAssignmentMutation } from '@/lib/redux/api';
import {
  CREW_ASSIGNMENT_ROLE_LABELS,
  CREW_ASSIGNMENT_STATUS_BADGE_VARIANT,
  CREW_ASSIGNMENT_STATUS_LABELS,
} from '@/lib/types/enums';
import type { CrewAssignmentRole } from '@/lib/types/enums';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { MediaTeamMember } from '@/lib/types/media-team-member';

// One row per fixed role slot on the Crew Assignment Board — CrewAssignmentRole has
// exactly 8 values (brief Section 2), so this renders as fill-the-slot rows rather
// than a free-form repeating list the way protocol_dept_app's leg assignments do
// (those can repeat per preaching day; a crew role can't repeat within one service —
// see the schema's unique (service, role) index).
export function CrewRoleSlot({
  serviceId,
  role,
  callTime,
  assignment,
  members,
}: {
  serviceId: string;
  role: CrewAssignmentRole;
  callTime: string;
  assignment: CrewAssignment | undefined;
  members: MediaTeamMember[] | undefined;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [createAssignment, { isLoading: isAssigning }] = useCreateCrewAssignmentMutation();
  const [deleteAssignment, { isLoading: isRemoving }] = useDeleteCrewAssignmentMutation();

  async function handleAssign() {
    if (!selectedMemberId) return;
    try {
      await createAssignment({
        service: serviceId,
        media_team_member: selectedMemberId,
        role,
        call_time: callTime,
      }).unwrap();
      toast.success(`${CREW_ASSIGNMENT_ROLE_LABELS[role]} assigned`);
      setSelectedMemberId(null);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not assign this role.');
    }
  }

  async function handleRemove() {
    if (!assignment) return;
    try {
      await deleteAssignment({
        id: assignment._id,
        serviceId,
        mediaTeamMemberId: assignment.media_team_member,
      }).unwrap();
      toast.success('Assignment removed');
      setRemoveOpen(false);
    } catch {
      toast.error('Could not remove this assignment.');
    }
  }

  const assignedMember = members?.find((m) => m._id === assignment?.media_team_member);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-foreground">
          {CREW_ASSIGNMENT_ROLE_LABELS[role]}
        </p>
        {assignment ? (
          <p className="text-caption text-muted-foreground">
            {assignedMember?.full_name ?? 'Unknown member'}
          </p>
        ) : (
          <p className="text-caption text-muted-foreground">Unassigned</p>
        )}
      </div>

      {assignment ? (
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
            onClick={() => setRemoveOpen(true)}
            disabled={isRemoving}
            aria-label={`Remove ${CREW_ASSIGNMENT_ROLE_LABELS[role]} assignment`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  members?.find((m) => m._id === value)?.full_name ?? 'Choose a member'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members?.map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAssign} disabled={!selectedMemberId || isAssigning}>
            Assign
          </Button>
        </div>
      )}

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {CREW_ASSIGNMENT_ROLE_LABELS[role]} will no longer have anyone assigned.
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
