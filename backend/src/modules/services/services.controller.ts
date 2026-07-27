import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service (starts at status PLANNED)' })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all services, most recent first' })
  findAll() {
    return this.servicesService.findAll();
  }

  // Declared before ':id' — Nest matches routes in registration order, so a literal
  // segment must come first or it'd be swallowed as an :id param.
  @Get('live-now')
  @ApiOperation({ summary: 'List services currently active in the pipeline (past PLANNED, short of ARCHIVED) — powers the Live Now dashboard' })
  findLiveNow() {
    return this.servicesService.findLiveNow();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single service' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({
    summary:
      "Merged status timeline for a service — its own log plus every one of its broadcasts' logs, most recent first",
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  getMergedTimeline(@Param('id') id: string) {
    return this.servicesService.getMergedTimeline(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service\'s details (not its status — see Phase 2)' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move a service to its next status — validated against the state machine, writes a StatusLog entry' })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateServiceStatusDto) {
    return this.servicesService.updateStatus(id, dto);
  }
}
