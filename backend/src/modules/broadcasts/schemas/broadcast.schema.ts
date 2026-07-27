import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BroadcastStatus } from '../../../common/enums';

export type BroadcastDocument = HydratedDocument<Broadcast>;

@Schema({ timestamps: true })
export class Broadcast {
  @Prop({ type: Types.ObjectId, ref: 'Service', required: true, index: true })
  service: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Platform', required: true, index: true })
  platform: Types.ObjectId;

  @Prop({ required: true })
  scheduled_start_time: Date;

  @Prop({ required: true, enum: BroadcastStatus, default: BroadcastStatus.SCHEDULED })
  status: BroadcastStatus;

  @Prop({ trim: true })
  external_stream_url?: string;

  @Prop({ trim: true })
  external_video_id?: string;

  @Prop()
  peak_viewer_count?: number;

  @Prop({ trim: true })
  notes?: string;
}

export const BroadcastSchema = SchemaFactory.createForClass(Broadcast);

// One Broadcast per Platform per Service — the brief's Section 2 model ("one Service
// has one Broadcast per Platform it streams to"), not a repeating list.
BroadcastSchema.index({ service: 1, platform: 1 }, { unique: true });
