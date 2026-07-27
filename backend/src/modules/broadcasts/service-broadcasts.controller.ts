import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BroadcastsService } from './broadcasts.service';

// Lives in BroadcastsModule rather than ServicesModule for the same
// sibling-controller reasoning as CrewAssignmentsModule's
// ServiceCrewAssignmentsController — keeps the "read side" convention consistent
// across modules even though Services and Broadcasts already have a forwardRef
// relationship for the rollup logic.
@ApiTags('services')
@Controller('services')
export class ServiceBroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get(':id/broadcasts')
  @ApiOperation({ summary: "List a service's broadcasts (per-platform live status breakdown)" })
  findByService(@Param('id') id: string) {
    return this.broadcastsService.findByService(id);
  }
}
