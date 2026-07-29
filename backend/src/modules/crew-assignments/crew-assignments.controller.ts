import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';
import { CreateCrewAssignmentDto } from './dto/create-crew-assignment.dto';
import { UpdateCrewAssignmentDto } from './dto/update-crew-assignment.dto';
import { UpdateCrewAssignmentStatusDto } from './dto/update-crew-assignment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MediaTeamMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Assigning crew (create/reassign/delete) and browsing the full list are ADMIN/
// DIRECTOR-only — this is the Crew Assignment Board's backing API, a production-lead
// tool per backend/CLAUDE.md. Marking one's own assignment confirmed/completed is
// different: MEMBER does this themselves, so updateStatus is open to the owning
// MEMBER too (or an ADMIN/DIRECTOR override) — see the ownership check below, which
// RolesGuard's route-level check can't express on its own since it needs the
// assignment's own media_team_member id.
@ApiTags('crew-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crew-assignments')
export class CrewAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Assign a media team member to a crew role for a service' })
  @ApiConflictResponse({ description: 'This role is already filled for this service' })
  create(@Body() dto: CreateCrewAssignmentDto) {
    return this.crewAssignmentsService.create(dto);
  }

  @Get()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'List all crew assignments' })
  findAll() {
    return this.crewAssignmentsService.findAll();
  }

  @Get(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Get a single crew assignment' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  findOne(@Param('id') id: string) {
    return this.crewAssignmentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move a crew assignment to its next status (transition-guarded)' })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCrewAssignmentStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const assignment = await this.crewAssignmentsService.findOne(id);
    const isOwner = assignment.media_team_member.toString() === user.sub;
    if (!isOwner && !ELEVATED_ROLES.includes(user.role)) {
      throw new ForbiddenException('You can only update your own assignments');
    }
    return this.crewAssignmentsService.updateStatus(id, dto);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update crew assignment details (reassign, reschedule, re-roster, notes)' })
  @ApiConflictResponse({ description: 'This role is already filled for this service' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCrewAssignmentDto) {
    return this.crewAssignmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a crew assignment' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  remove(@Param('id') id: string) {
    return this.crewAssignmentsService.remove(id);
  }
}
