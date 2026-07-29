import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole } from '../../common/enums';

// Lives in CrewAssignmentsModule rather than ServicesModule to avoid a circular
// module dependency — CrewAssignmentsModule already imports ServicesModule (for
// referential validation in create()/update()), so ServicesModule can't import back.
// Same technique protocol_dept_app uses for its own invitation-assignments.controller.ts.
//
// ADMIN/DIRECTOR-only, same as CrewAssignmentsController's list/findOne — this is the
// Crew Assignment Board's per-service view, a production-lead tool. A MEMBER's
// equivalent is MediaTeamMemberAssignmentsController's own-scoped "My Assignments".
@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR)
@Controller('services')
export class ServiceCrewAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Get(':id/crew-assignments')
  @ApiOperation({ summary: "List a service's crew assignments (Crew Assignment Board)" })
  findByService(@Param('id') id: string) {
    return this.crewAssignmentsService.findByService(id);
  }
}
