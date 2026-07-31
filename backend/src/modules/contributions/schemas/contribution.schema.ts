import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ContributionProvider, ContributionStatus } from '../../../common/enums';

export type ContributionDocument = HydratedDocument<Contribution>;

@Schema({ timestamps: true })
export class Contribution {
  @Prop({ required: true, type: Types.ObjectId, ref: 'ContributionCampaign' })
  campaign: Types.ObjectId;

  // Always derived from the authenticated request (@CurrentUser()) in the controller —
  // never accepted from the request body. See the brief's Section 4I rule.
  @Prop({ required: true, type: Types.ObjectId, ref: 'MediaTeamMember' })
  contributor: Types.ObjectId;

  // Integer, kobo — the amount this Contribution is *expected* to be. verifyAndSync()
  // only ever marks a contribution SUCCESSFUL if the gateway's own verify API reports
  // this exact amount; a mismatch is treated as a failed/tampered payment, never
  // silently accepted.
  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({ required: true, enum: ContributionProvider })
  provider: ContributionProvider;

  // Server-generated before the gateway is ever called — what our system looks
  // transactions up by, both for the frontend return page and incoming webhooks.
  @Prop({ required: true, unique: true })
  internal_reference: string;

  @Prop()
  provider_reference?: string;

  @Prop({ required: true, enum: ContributionStatus, default: ContributionStatus.PENDING })
  status: ContributionStatus;

  @Prop()
  checkout_url?: string;

  @Prop()
  paid_at?: Date;

  // The last verify/webhook response body — full audit trail for every contribution,
  // successful or not.
  @Prop({ type: Object })
  raw_provider_payload?: Record<string, unknown>;

  @Prop({ trim: true })
  notes?: string;
}

export const ContributionSchema = SchemaFactory.createForClass(Contribution);
