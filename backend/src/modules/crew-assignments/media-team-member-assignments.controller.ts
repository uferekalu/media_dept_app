import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';

// Lives in CrewAssignmentsModule for the same circular-dependency reason as
// ServiceCrewAssignmentsController — see that file's comment. "My Assignments" is
// unfiltered by identity for now (no ownership check) since Auth doesn't exist until
// Phase 7 — any id can be queried; add the "only your own" guard alongside login.
@ApiTags('media-team-members')
@Controller('media-team-members')
export class MediaTeamMemberAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: "List a media team member's crew assignments (My Assignments)" })
  findByMediaTeamMember(@Param('id') id: string) {
    return this.crewAssignmentsService.findByMediaTeamMember(id);
  }
}
