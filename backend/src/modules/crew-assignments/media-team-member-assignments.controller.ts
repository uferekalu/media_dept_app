import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MediaTeamMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Lives in CrewAssignmentsModule for the same circular-dependency reason as
// ServiceCrewAssignmentsController — see that file's comment.
//
// "My Assignments" — a MEMBER may only fetch their own list; ADMIN/DIRECTOR can view
// anyone's. Ownership check only, no RolesGuard here — any authenticated role may call
// this for their own id.
@ApiTags('media-team-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-team-members')
export class MediaTeamMemberAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: "List a media team member's crew assignments (My Assignments)" })
  findByMediaTeamMember(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const isSelf = user.sub === id;
    if (!isSelf && !ELEVATED_ROLES.includes(user.role)) {
      throw new ForbiddenException('You can only view your own assignments');
    }
    return this.crewAssignmentsService.findByMediaTeamMember(id);
  }
}
