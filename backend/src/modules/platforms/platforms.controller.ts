import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { UpdatePlatformDto } from './dto/update-platform.dto';

// Read + narrow update only — no create/delete endpoint. The list is seeded once
// (PlatformsService.onModuleInit) and its membership isn't meant to change via the API.
@ApiTags('platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @ApiOperation({ summary: 'List distribution platforms (YouTube, Facebook, In-House TV Feed)' })
  findAll() {
    return this.platformsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single platform' })
  @ApiNotFoundResponse({ description: 'Platform not found' })
  findOne(@Param('id') id: string) {
    return this.platformsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a platform\'s external channel/page id or enabled flag' })
  @ApiNotFoundResponse({ description: 'Platform not found' })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformsService.update(id, dto);
  }
}
