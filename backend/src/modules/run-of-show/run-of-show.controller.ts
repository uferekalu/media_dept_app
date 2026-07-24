import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RunOfShowService } from './run-of-show.service';
import { CreateRunOfShowItemDto } from './dto/create-run-of-show-item.dto';
import { UpdateRunOfShowItemDto } from './dto/update-run-of-show-item.dto';

@ApiTags('run-of-show')
@Controller('run-of-show')
export class RunOfShowController {
  constructor(private readonly runOfShowService: RunOfShowService) {}

  @Post()
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
  @ApiOperation({ summary: 'Update a run-of-show segment' })
  @ApiBadRequestResponse({ description: "scheduled_start_time falls outside the service's window" })
  @ApiNotFoundResponse({ description: 'Run-of-show item not found' })
  update(@Param('id') id: string, @Body() dto: UpdateRunOfShowItemDto) {
    return this.runOfShowService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a run-of-show segment' })
  @ApiNotFoundResponse({ description: 'Run-of-show item not found' })
  remove(@Param('id') id: string) {
    return this.runOfShowService.remove(id);
  }
}
