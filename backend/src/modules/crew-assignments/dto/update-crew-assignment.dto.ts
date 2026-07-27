import { PartialType } from '@nestjs/swagger';
import { CreateCrewAssignmentDto } from './create-crew-assignment.dto';

// Deliberately does NOT include `status` — that can only change through
// CrewAssignmentsService.updateStatus() via UpdateCrewAssignmentStatusDto, which
// enforces the transition guard. This DTO covers reassignment (media_team_member),
// rescheduling (call_time), re-rostering (role), and notes.
export class UpdateCrewAssignmentDto extends PartialType(CreateCrewAssignmentDto) {}
