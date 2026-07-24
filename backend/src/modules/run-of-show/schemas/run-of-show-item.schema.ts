import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RunOfShowItemDocument = HydratedDocument<RunOfShowItem>;

@Schema({ timestamps: true })
export class RunOfShowItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Service' })
  service: Types.ObjectId;

  @Prop({ required: true })
  order: number;

  @Prop({ required: true, trim: true })
  segment_name: string;

  @Prop({ required: true })
  scheduled_start_time: Date;

  @Prop({ required: true })
  duration_minutes: number;

  @Prop({ trim: true })
  graphics_notes?: string;

  @Prop({ trim: true })
  notes?: string;
}

export const RunOfShowItemSchema = SchemaFactory.createForClass(RunOfShowItem);
