import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EquipmentCheckoutDocument = HydratedDocument<EquipmentCheckout>;

@Schema({ timestamps: true })
export class EquipmentCheckout {
  @Prop({ type: Types.ObjectId, ref: 'Equipment', required: true, index: true })
  equipment: Types.ObjectId;

  // Optional — brief Section 2: "a checkout may not always be tied to a specific
  // service" (e.g. a laptop borrowed for general edit work).
  @Prop({ type: Types.ObjectId, ref: 'Service' })
  service?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MediaTeamMember', required: true, index: true })
  checked_out_to: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  checked_out_at: Date;

  @Prop({ required: true })
  expected_return_at: Date;

  // Null until EquipmentCheckoutsService.returnEquipment() sets it — the signal that
  // this checkout is closed out and the equipment is back.
  @Prop()
  returned_at?: Date;

  @Prop({ trim: true })
  notes?: string;
}

export const EquipmentCheckoutSchema = SchemaFactory.createForClass(EquipmentCheckout);
