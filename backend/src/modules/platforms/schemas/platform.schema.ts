import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PlatformName } from '../../../common/enums';

export type PlatformDocument = HydratedDocument<Platform>;

// A small, mostly-fixed reference list (brief Section 2) — seeded on first boot by
// PlatformsService, not created ad hoc per service.
@Schema({ timestamps: true })
export class Platform {
  @Prop({ required: true, enum: PlatformName, unique: true })
  name: PlatformName;

  // Used later (Phase 8) for API calls (YouTube Data API / Facebook Graph API) — not
  // applicable to IN_HOUSE_TV_FEED, which has no API.
  @Prop({ trim: true })
  external_channel_or_page_id?: string;

  // Lets the department turn a platform on/off without deleting its history.
  @Prop({ required: true, default: true })
  enabled: boolean;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
