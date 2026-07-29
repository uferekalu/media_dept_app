import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RunOfShowService } from './run-of-show.service';
import { CreateRunOfShowItemDto } from './dto/create-run-of-show-item.dto';
import { UpdateRunOfShowItemDto } from './dto/update-run-of-show-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Every route requires login; write routes are ADMIN/DIRECTOR-only per
// backend/CLAUDE.md — reading is open to any authenticated role.
@ApiTags('run-of-show')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('run-of-show')
export class RunOfShowController {
  constructor(private readonly runOfShowService: RunOfShowService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Add a run-of-show segment to a service' })
  @ApiBadRequestResponse({ description: "scheduled_start_time falls outside the service's window" })
  create(@Body() dto: CreateRunOfShowItemDto) {
    return this.runOfShowService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List run-of-show segments for a service, in order' })
  @ApiQuery({ name: 'service', required: true, description: 'Service id' })
  findForService(@Query('service') service: string) {
    return this.runOfShowService.findForService(service);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single run-of-show segment' })
  @ApiNotFoundResponse({ description: 'Run-of-show item not found' })
  findOne(@Param('id') id: string) {
    return this.runOfShowService.findOne(id);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update a run-of-show segment' })
  @ApiBadRequestResponse({ description: "scheduled_start_time falls outside the service's window" })
  @ApiNotFoundResponse({ description: 'Run-of-show item not found' })
  update(@Param('id') id: string, @Body() dto: UpdateRunOfShowItemDto) {
    return this.runOfShowService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a run-of-show segment' })
  @ApiNotFoundResponse({ description: 'Run-of-show item not found' })
  remove(@Param('id') id: string) {
    return this.runOfShowService.remove(id);
  }
}
