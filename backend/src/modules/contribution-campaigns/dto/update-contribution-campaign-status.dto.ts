import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContributionCampaignStatus } from '../../../common/enums';

export class UpdateContributionCampaignStatusDto {
  @ApiProperty({ enum: ContributionCampaignStatus, example: ContributionCampaignStatus.CLOSED })
  @IsEnum(ContributionCampaignStatus)
  status: ContributionCampaignStatus;
}
