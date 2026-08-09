'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReassignCrewAssignmentMutation } from '@/lib/redux/api';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { MediaTeamMember } from '@/lib/types/media-team-member';

// Direct one-click reassignment for a filled crew role — Admin/Director can swap who's
// assigned without deleting and recreating the assignment (which used to be the only
// option, losing the assignment's own id/history in the process). Shared between
// CrewRoleSlot (per-service board) and the All Assignments board so both surfaces
// offer the same capability the same way.
export function CrewReassignControl({
  assignment,
  members,
}: {
  assignment: CrewAssignment;
  members: MediaTeamMember[] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [reassign, { isLoading }] = useReassignCrewAssignmentMutation();

  async function handleConfirm() {
    if (!selectedMemberId || selectedMemberId === assignment.media_team_member) return;
    try {
      await reassign({
        id: assignment._id,
        media_team_member: selectedMemberId,
        previousMediaTeamMemberId: assignment.media_team_member,
      }).unwrap();
      toast.success('Reassigned');
      setOpen(false);
      setSelectedMemberId(null);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not reassign this role.');
    }
  }

  if (!open) {
    return (
      <Button size="icon-sm" variant="outline" aria-label="Reassign" onClick={() => setOpen(true)}>
        <Repeat className="size-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
        <SelectTrigger size="sm" className="min-w-40">
          <SelectValue>
            {(value: string | null) => members?.find((m) => m._id === value)?.full_name ?? 'Choose a member'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {members
            ?.filter((m) => m._id !== assignment.media_team_member)
            .map((member) => (
              <SelectItem key={member._id} value={member._id}>
                {member.full_name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleConfirm} disabled={!selectedMemberId || isLoading}>
        {isLoading ? 'Saving…' : 'Confirm'}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
        Cancel
      </Button>
    </div>
  );
}
