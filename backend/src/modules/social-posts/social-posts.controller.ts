import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SocialPostsService } from './social-posts.service';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { UpdateSocialPostDto } from './dto/update-social-post.dto';
import { UpdateSocialPostStatusDto } from './dto/update-social-post-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole, SocialPostStatus } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Every route requires login; write routes are ADMIN/DIRECTOR-only per
// backend/CLAUDE.md's "Auth & roles" section (social distribution is a coordination
// task, same elevated-only bucket as Services/Broadcasts/RunOfShow/Equipment — not one
// of the specific carve-outs the brief grants a plain MEMBER, e.g. media asset upload).
// Reading is open to any authenticated role.
@ApiTags('social-posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('social-posts')
export class SocialPostsController {
  constructor(private readonly socialPostsService: SocialPostsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Draft a social post referencing a media asset and a target platform' })
  create(@Body() dto: CreateSocialPostDto) {
    return this.socialPostsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List social posts, optionally filtered by platform or status' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SocialPostStatus })
  findAll(@Query('platform') platform?: string, @Query('status') status?: SocialPostStatus) {
    return this.socialPostsService.findAll({ platform, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single social post' })
  @ApiNotFoundResponse({ description: 'Social post not found' })
  findOne(@Param('id') id: string) {
    return this.socialPostsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Move a social post to its next status (transition-guarded)' })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Social post not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSocialPostStatusDto) {
    return this.socialPostsService.updateStatus(id, dto);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update a social post (re-caption, reschedule, re-link asset/platform)' })
  @ApiNotFoundResponse({ description: 'Social post not found' })
  update(@Param('id') id: string, @Body() dto: UpdateSocialPostDto) {
    return this.socialPostsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a social post' })
  @ApiNotFoundResponse({ description: 'Social post not found' })
  remove(@Param('id') id: string) {
    return this.socialPostsService.remove(id);
  }
}
