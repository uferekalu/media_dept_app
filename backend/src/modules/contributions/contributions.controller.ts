import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service';
import { InitiateContributionDto } from './dto/initiate-contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContributionProvider, ContributionStatus, MediaTeamMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// Brief Section 4I: the full ledger is Admin-only — stricter than every other
// Admin/Director split in this app, since it's the one screen showing who gave how
// much. Everyone else can only ever see their own contributions.
const LEDGER_ROLES = [MediaTeamMemberRole.ADMIN];

@ApiTags('contributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Start a contribution — returns a gateway-hosted checkout_url to redirect to' })
  initiate(@Body() dto: InitiateContributionDto, @CurrentUser() user: JwtPayload) {
    return this.contributionsService.initiate(dto, user.sub);
  }

  @Get()
  @Roles(...LEDGER_ROLES)
  @ApiOperation({ summary: 'Full contributions ledger (Admin-only)' })
  @ApiQuery({ name: 'campaign', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ContributionStatus })
  @ApiQuery({ name: 'provider', required: false, enum: ContributionProvider })
  findAll(
    @Query('campaign') campaign?: string,
    @Query('status') status?: ContributionStatus,
    @Query('provider') provider?: ContributionProvider,
  ) {
    return this.contributionsService.findAll({ campaign, status, provider });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contribution — the contributor themselves, or an Admin' })
  @ApiNotFoundResponse({ description: 'Contribution not found' })
  @ApiForbiddenResponse({ description: "Not this contribution's owner and not an Admin" })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const contribution = await this.contributionsService.findOne(id);
    this.assertCanView(contribution.contributor.toString(), user);
    return contribution;
  }

  @Post(':id/verify')
  @ApiOperation({
    summary:
      'Manually re-check this contribution against the gateway — a safety net for the frontend return page in case the webhook is delayed',
  })
  @ApiNotFoundResponse({ description: 'Contribution not found' })
  @ApiForbiddenResponse({ description: "Not this contribution's owner and not an Admin" })
  async verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const contribution = await this.contributionsService.findOne(id);
    this.assertCanView(contribution.contributor.toString(), user);
    return this.contributionsService.verifyAndSync(contribution.internal_reference);
  }

  private assertCanView(contributorId: string, user: JwtPayload): void {
    if (user.role !== MediaTeamMemberRole.ADMIN && contributorId !== user.sub) {
      throw new ForbiddenException('You can only view your own contributions.');
    }
  }
}
