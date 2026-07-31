import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { ContributionWebhooksController } from './contribution-webhooks.controller';
import { Contribution, ContributionSchema } from './schemas/contribution.schema';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema';
import { ContributionCampaignsModule } from '../contribution-campaigns/contribution-campaigns.module';
import { PaymentsModule } from '../../common/payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contribution.name, schema: ContributionSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    ContributionCampaignsModule,
    PaymentsModule,
  ],
  controllers: [ContributionsController, ContributionWebhooksController],
  providers: [ContributionsService],
})
export class ContributionsModule {}
