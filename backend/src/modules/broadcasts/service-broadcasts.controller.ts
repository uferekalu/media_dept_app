import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BroadcastsService } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Lives in BroadcastsModule rather than ServicesModule for the same
// sibling-controller reasoning as CrewAssignmentsModule's
// ServiceCrewAssignmentsController — keeps the "read side" convention consistent
// across modules even though Services and Broadcasts already have a forwardRef
// relationship for the rollup logic.
//
// Open to any authenticated role (no @Roles()) — unlike the Crew Assignment Board,
// per-platform live status is general operational visibility (e.g. "is the stream
// live"), not coordinator-only roster data.
@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServiceBroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get(':id/broadcasts')
  @ApiOperation({ summary: "List a service's broadcasts (per-platform live status breakdown)" })
  findByService(@Param('id') id: string) {
    return this.broadcastsService.findByService(id);
  }
}
