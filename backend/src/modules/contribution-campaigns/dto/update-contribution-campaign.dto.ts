import { PartialType } from '@nestjs/swagger';
import { CreateContributionCampaignDto } from './create-contribution-campaign.dto';

// Details only — status moves through its own guarded PATCH .../status endpoint (see
// UpdateContributionCampaignStatusDto), same split as SocialPost/CrewAssignment.
export class UpdateContributionCampaignDto extends PartialType(CreateContributionCampaignDto) {}
