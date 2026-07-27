import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EquipmentCategory, EquipmentCondition, EquipmentCurrentStatus } from '../../../common/enums';

export type EquipmentDocument = HydratedDocument<Equipment>;

@Schema({ timestamps: true })
export class Equipment {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: EquipmentCategory })
  category: EquipmentCategory;

  @Prop({ trim: true })
  serial_number?: string;

  @Prop({ required: true, enum: EquipmentCondition, default: EquipmentCondition.GOOD })
  condition: EquipmentCondition;

  @Prop({ required: true, enum: EquipmentCurrentStatus, default: EquipmentCurrentStatus.AVAILABLE })
  current_status: EquipmentCurrentStatus;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
