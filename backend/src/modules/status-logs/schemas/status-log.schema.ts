import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { StatusLogEntityType } from '../../../common/enums';

export type StatusLogDocument = HydratedDocument<StatusLog>;

// Append-only audit trail (brief Section 2/3) — polymorphic across Service and (from
// Phase 4) Broadcast. Never updated or deleted once written; the current status field
// on the owning entity is only a denormalized convenience, this collection is the
// source of truth for history.
@Schema({ timestamps: { createdAt: false, updatedAt: false } })
export class StatusLog {
  @Prop({ required: true, enum: StatusLogEntityType })
  entity_type: StatusLogEntityType;

  @Prop({ required: true, type: Types.ObjectId })
  entity_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  status: string;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  // Optional until Auth (Phase 7) exists to supply an authenticated identity — once it
  // does, this is derived from the request's JWT, never trusted from the request body
  // (same rule as protocol_dept_app's updated_by).
  @Prop({ type: Types.ObjectId, ref: 'MediaTeamMember' })
  updated_by?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;
}

export const StatusLogSchema = SchemaFactory.createForClass(StatusLog);
