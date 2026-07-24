import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceStatus, ServiceType } from '../../../common/enums';

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ServiceType })
  type: ServiceType;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  end_time: Date;

  @Prop({ trim: true })
  speaker?: string;

  @Prop({ trim: true })
  series?: string;

  @Prop({ required: true, trim: true })
  venue: string;

  @Prop({ trim: true })
  description?: string;

  // Enforcement of the transition map (VALID_SERVICE_STATUS_TRANSITIONS) arrives in
  // Phase 2 via a guarded PATCH /services/:id/status endpoint — this Phase 1 field is
  // plain, defaulted, and directly editable through the general update() for now.
  @Prop({ required: true, enum: ServiceStatus, default: ServiceStatus.PLANNED })
  status: ServiceStatus;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
