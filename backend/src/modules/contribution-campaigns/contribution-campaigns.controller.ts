import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContributionCampaignsService } from './contribution-campaigns.service';
import { CreateContributionCampaignDto } from './dto/create-contribution-campaign.dto';
import { UpdateContributionCampaignDto } from './dto/update-contribution-campaign.dto';
import { UpdateContributionCampaignStatusDto } from './dto/update-contribution-campaign-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContributionCampaignStatus, MediaTeamMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Every route requires login. Creating/editing/closing a campaign is ADMIN/DIRECTOR-only
// (brief Section 4I), same elevated-only bucket as Services/Broadcasts/Equipment.
// Reading is open to any authenticated role — a Member needs to see what's active and
// its progress in order to contribute to it.
@ApiTags('contribution-campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contribution-campaigns')
export class ContributionCampaignsController {
  constructor(private readonly contributionCampaignsService: ContributionCampaignsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Create a fundraising campaign (e.g. "Camera Repair Fund")' })
  create(@Body() dto: CreateContributionCampaignDto, @CurrentUser() user: JwtPayload) {
    return this.contributionCampaignsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List contribution campaigns, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false, enum: ContributionCampaignStatus })
  findAll(@Query('status') status?: ContributionCampaignStatus) {
    return this.contributionCampaignsService.findAll({ status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contribution campaign' })
  @ApiNotFoundResponse({ description: 'Contribution campaign not found' })
  findOne(@Param('id') id: string) {
    return this.contributionCampaignsService.findOne(id);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update a campaign\'s details (title, description, target amount, etc.)' })
  @ApiNotFoundResponse({ description: 'Contribution campaign not found' })
  @ApiBadRequestResponse({ description: 'target_amount is below the amount already raised' })
  update(@Param('id') id: string, @Body() dto: UpdateContributionCampaignDto) {
    return this.contributionCampaignsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: "Move a campaign to its next status (transition-guarded)" })
  @ApiBadRequestResponse({ description: 'The requested status is not a valid next step from the current status' })
  @ApiNotFoundResponse({ description: 'Contribution campaign not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContributionCampaignStatusDto) {
    return this.contributionCampaignsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign (only if it has not raised any money yet)' })
  @ApiNotFoundResponse({ description: 'Contribution campaign not found' })
  @ApiBadRequestResponse({ description: 'This campaign has already raised money — close it instead' })
  remove(@Param('id') id: string) {
    return this.contributionCampaignsService.remove(id);
  }
}
