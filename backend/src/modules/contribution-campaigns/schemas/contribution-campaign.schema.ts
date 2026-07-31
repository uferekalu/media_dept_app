import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ContributionCampaignPurposeCategory,
  ContributionCampaignStatus,
} from '../../../common/enums';

export type ContributionCampaignDocument = HydratedDocument<ContributionCampaign>;

@Schema({ timestamps: true })
export class ContributionCampaign {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ContributionCampaignPurposeCategory })
  purpose_category: ContributionCampaignPurposeCategory;

  @Prop({ type: Types.ObjectId, ref: 'Equipment' })
  equipment?: Types.ObjectId;

  // Integer, kobo (NGN's smallest unit) — matches how every payment gateway itself
  // represents amounts, so no unit conversion happens anywhere in this system.
  @Prop({ required: true, min: 1 })
  target_amount: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({
    required: true,
    enum: ContributionCampaignStatus,
    default: ContributionCampaignStatus.ACTIVE,
  })
  status: ContributionCampaignStatus;

  // Denormalized cache, same "log is truth, field is convenience" philosophy as
  // Service.status — recomputed from the sum of this campaign's SUCCESSFUL
  // Contributions once PR-031 adds that entity. Never client-writable.
  @Prop({ required: true, default: 0, min: 0 })
  current_amount: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'MediaTeamMember' })
  created_by: Types.ObjectId;
}

export const ContributionCampaignSchema = SchemaFactory.createForClass(ContributionCampaign);
