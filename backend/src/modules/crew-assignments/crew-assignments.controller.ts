import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrewAssignmentsService } from './crew-assignments.service';
import { CreateCrewAssignmentDto } from './dto/create-crew-assignment.dto';
import { UpdateCrewAssignmentDto } from './dto/update-crew-assignment.dto';
import { UpdateCrewAssignmentStatusDto } from './dto/update-crew-assignment-status.dto';

// Unguarded for now — role-based access (Admin/Director assign, Member confirms/
// completes only their own) is applied in Phase 7 once Auth exists, per
// backend/CLAUDE.md, mirroring how services/media-team-members are unguarded so far.
@ApiTags('crew-assignments')
@Controller('crew-assignments')
export class CrewAssignmentsController {
  constructor(private readonly crewAssignmentsService: CrewAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a media team member to a crew role for a service' })
  @ApiConflictResponse({ description: 'This role is already filled for this service' })
  create(@Body() dto: CreateCrewAssignmentDto) {
    return this.crewAssignmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all crew assignments' })
  findAll() {
    return this.crewAssignmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single crew assignment' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  findOne(@Param('id') id: string) {
    return this.crewAssignmentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move a crew assignment to its next status (transition-guarded)' })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCrewAssignmentStatusDto) {
    return this.crewAssignmentsService.updateStatus(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update crew assignment details (reassign, reschedule, re-roster, notes)' })
  @ApiConflictResponse({ description: 'This role is already filled for this service' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCrewAssignmentDto) {
    return this.crewAssignmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a crew assignment' })
  @ApiNotFoundResponse({ description: 'Crew assignment not found' })
  remove(@Param('id') id: string) {
    return this.crewAssignmentsService.remove(id);
  }
}
