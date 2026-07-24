import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { StatusLogsService } from './status-logs.service';
import { CreateStatusLogDto } from './dto/create-status-log.dto';
import { StatusLogEntityType } from '../../common/enums';

// Append-only: only Create and Read are exposed, no Patch/Delete anywhere in this
// controller — matches the brief's "never overwritten" rule for StatusLog.
@ApiTags('status-logs')
@Controller('status-logs')
export class StatusLogsController {
  constructor(private readonly statusLogsService: StatusLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a status-change log entry (append-only)' })
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
