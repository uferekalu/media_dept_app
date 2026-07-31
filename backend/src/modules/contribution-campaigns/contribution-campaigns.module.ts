import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContributionCampaignsService } from './contribution-campaigns.service';
import { ContributionCampaignsController } from './contribution-campaigns.controller';
import {
  ContributionCampaign,
  ContributionCampaignSchema,
} from './schemas/contribution-campaign.schema';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContributionCampaign.name, schema: ContributionCampaignSchema },
    ]),
    EquipmentModule,
  ],
  controllers: [ContributionCampaignsController],
  providers: [ContributionCampaignsService],
  exports: [ContributionCampaignsService],
})
export class ContributionCampaignsModule {}
