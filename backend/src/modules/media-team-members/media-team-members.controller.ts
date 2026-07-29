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
import { ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaTeamMembersService } from './media-team-members.service';
import { CreateMediaTeamMemberDto } from './dto/create-media-team-member.dto';
import { UpdateMediaTeamMemberDto } from './dto/update-media-team-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MediaTeamMemberRole } from '../../common/enums';

// Every route requires login. Per backend/CLAUDE.md's "Auth & roles" section:
// - GET (directory) is open to any authenticated role.
// - POST (direct admin-create) is ADMIN-only — an escape hatch, not the primary path
//   (that's POST /auth/signup).
// - PATCH is self-or-ADMIN, with an extra field-level check: only ADMIN may change a
//   `role`. This ownership/field authorization is beyond what RolesGuard's route-level
//   check alone can express, so it lives here in the controller — see update() below.
// - DELETE is ADMIN-only.
@ApiTags('media-team-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media-team-members')
export class MediaTeamMembersController {
  constructor(private readonly mediaTeamMembersService: MediaTeamMembersService) {}

  @Post()
  @Roles(MediaTeamMemberRole.ADMIN)
  @ApiOperation({ summary: 'Create a media team member directly (ADMIN escape hatch — self-service sign-up at POST /auth/signup is the primary path)' })
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
  @ApiOperation({ summary: 'Update a media team member — self, or an ADMIN editing anyone' })
  @ApiConflictResponse({ description: 'A media team member with this phone number already exists' })
  @ApiNotFoundResponse({ description: 'Media team member not found' })
  @ApiForbiddenResponse({ description: 'Only an ADMIN can edit another member or change a role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaTeamMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertSelfOrAdmin(id, user, 'You can only edit your own profile');
    const isAdmin = user.role === MediaTeamMemberRole.ADMIN;
    if (dto.role && !isAdmin) {
      throw new ForbiddenException('Only an ADMIN can change a role');
    }

    return this.mediaTeamMembersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(MediaTeamMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media team member' })
  @ApiNotFoundResponse({ description: 'Media team member not found' })
  remove(@Param('id') id: string) {
    return this.mediaTeamMembersService.remove(id);
  }

  private assertSelfOrAdmin(id: string, user: JwtPayload, message: string): void {
    const isSelf = user.sub === id;
    const isAdmin = user.role === MediaTeamMemberRole.ADMIN;
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(message);
    }
  }
}
