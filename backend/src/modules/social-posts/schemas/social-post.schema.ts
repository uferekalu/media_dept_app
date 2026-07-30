import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SocialPostStatus } from '../../../common/enums';

export type SocialPostDocument = HydratedDocument<SocialPost>;

@Schema({ timestamps: true })
export class SocialPost {
  @Prop({ required: true, type: Types.ObjectId, ref: 'MediaAsset' })
  media_asset: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Platform' })
  platform: Types.ObjectId;

  @Prop({ required: true, trim: true })
  caption: string;

  @Prop({ required: true })
  scheduled_time: Date;

  // Null until SocialPostsService.updateStatus() moves this to PUBLISHED, at which
  // point it's set automatically to "now" — never a user-supplied value, since it
  // records when the post was actually marked published, not when it was scheduled for.
  @Prop()
  published_time?: Date;

  @Prop({ required: true, enum: SocialPostStatus, default: SocialPostStatus.DRAFT })
  status: SocialPostStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: 'MediaTeamMember' })
  posted_by: Types.ObjectId;
}

export const SocialPostSchema = SchemaFactory.createForClass(SocialPost);
