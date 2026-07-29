import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { StatusLogsService } from './status-logs.service';
import { CreateStatusLogDto } from './dto/create-status-log.dto';
import { StatusLogEntityType, MediaTeamMemberRole } from '../../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Append-only: only Create and Read are exposed, no Patch/Delete anywhere in this
// controller — matches the brief's "never overwritten" rule for StatusLog. In normal
// operation, every real entry is written internally as a side effect of a guarded
// status-transition endpoint (ServicesService.updateStatus(),
// BroadcastsService.updateStatus()), never through this route directly — POST here is
// kept as an ADMIN-only manual-correction escape hatch (same pattern as the
// admin-create routes on MediaTeamMembers/Equipment), not a general-purpose write path.
// Reading the timeline is open to any authenticated role.
@ApiTags('status-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('status-logs')
export class StatusLogsController {
  constructor(private readonly statusLogsService: StatusLogsService) {}

  @Post()
  @Roles(MediaTeamMemberRole.ADMIN)
  @ApiOperation({ summary: 'Record a status-change log entry manually (ADMIN-only correction escape hatch — normally written internally by a guarded status transition)' })
  create(@Body() dto: CreateStatusLogDto) {
    return this.statusLogsService.create(dto);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get the timeline for a Service or Broadcast, most recent first' })
  @ApiParam({ name: 'entityType', enum: StatusLogEntityType })
  findForEntity(
    @Param('entityType') entityType: StatusLogEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.statusLogsService.findForEntity(entityType, entityId);
  }
}
