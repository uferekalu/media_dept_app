import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaTeamMembersService } from './media-team-members.service';
import { CreateMediaTeamMemberDto } from './dto/create-media-team-member.dto';
import { UpdateMediaTeamMemberDto } from './dto/update-media-team-member.dto';

// Unguarded in Phase 1 — role-based access (Admin/Director full CRUD, Member
// self-edit-only) is applied in Phase 7 once Auth exists, per backend/CLAUDE.md.
@ApiTags('media-team-members')
@Controller('media-team-members')
export class MediaTeamMembersController {
  constructor(private readonly mediaTeamMembersService: MediaTeamMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a media team member' })
  @ApiConflictResponse({ description: 'A media team member with this phone number already exists' })
  create(@Body() dto: CreateMediaTeamMemberDto) {
    return this.mediaTeamMembersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all media team members (team directory)' })
  findAll() {
    return this.mediaTeamMembersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single media team member' })
  @ApiNotFoundResponse({ description: 'Media team member not found' })
  findOne(@Param('id') id: string) {
    return this.mediaTeamMembersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a media team member' })
  @ApiConflictResponse({ description: 'A media team member with this phone number already exists' })
  @ApiNotFoundResponse({ description: 'Media team member not found' })
  update(@Param('id') id: string, @Body() dto: UpdateMediaTeamMemberDto) {
    return this.mediaTeamMembersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media team member' })
  @ApiNotFoundResponse({ description: 'Media team member not found' })
  remove(@Param('id') id: string) {
    return this.mediaTeamMembersService.remove(id);
  }
}
