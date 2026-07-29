import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { UpdateBroadcastStatusDto } from './dto/update-broadcast-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Every route requires login; write routes are ADMIN/DIRECTOR-only per
// backend/CLAUDE.md — reading is open to any authenticated role.
@ApiTags('broadcasts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Create a broadcast for a service on a platform' })
  @ApiConflictResponse({ description: 'A broadcast for this service on this platform already exists' })
  @ApiBadRequestResponse({ description: 'The platform is disabled' })
  create(@Body() dto: CreateBroadcastDto) {
    return this.broadcastsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all broadcasts' })
  findAll() {
    return this.broadcastsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single broadcast' })
  @ApiNotFoundResponse({ description: 'Broadcast not found' })
  findOne(@Param('id') id: string) {
    return this.broadcastsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({
    summary:
      'Move a broadcast to its next status (transition-guarded) — may auto-advance the parent Service (rollup)',
  })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Broadcast not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBroadcastStatusDto) {
    return this.broadcastsService.updateStatus(id, dto);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update broadcast details (platform link, schedule, external ids, notes)' })
  @ApiConflictResponse({ description: 'A broadcast for this service on this platform already exists' })
  @ApiNotFoundResponse({ description: 'Broadcast not found' })
  update(@Param('id') id: string, @Body() dto: UpdateBroadcastDto) {
    return this.broadcastsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a broadcast' })
  @ApiNotFoundResponse({ description: 'Broadcast not found' })
  remove(@Param('id') id: string) {
    return this.broadcastsService.remove(id);
  }
}
