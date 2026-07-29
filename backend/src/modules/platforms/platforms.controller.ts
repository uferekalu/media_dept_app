import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole } from '../../common/enums';

// Read + narrow update only — no create/delete endpoint. The list is seeded once
// (PlatformsService.onModuleInit) and its membership isn't meant to change via the API.
// Every route requires login; the update route is ADMIN/DIRECTOR-only.
@ApiTags('platforms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR)
  @ApiOperation({ summary: 'Update a platform\'s external channel/page id or enabled flag' })
  @ApiNotFoundResponse({ description: 'Platform not found' })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformsService.update(id, dto);
  }
}
