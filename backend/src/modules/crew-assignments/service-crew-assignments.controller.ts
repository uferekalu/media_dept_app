import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';

// Lives in CrewAssignmentsModule rather than ServicesModule to avoid a circular
// module dependency — CrewAssignmentsModule already imports ServicesModule (for
// referential validation in create()/update()), so ServicesModule can't import back.
// Same technique protocol_dept_app uses for its own invitation-assignments.controller.ts.
@ApiTags('services')
@Controller('services')
export class ServiceCrewAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Get(':id/crew-assignments')
  @ApiOperation({ summary: "List a service's crew assignments (Crew Assignment Board)" })
  findByService(@Param('id') id: string) {
    return this.crewAssignmentsService.findByService(id);
  }
}
