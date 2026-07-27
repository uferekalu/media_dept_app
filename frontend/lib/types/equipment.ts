import type { EquipmentCategory, EquipmentCondition, EquipmentCurrentStatus } from './enums';

export interface Equipment {
  _id: string;
  name: string;
  category: EquipmentCategory;
  serial_number?: string;
  condition: EquipmentCondition;
  current_status: EquipmentCurrentStatus;
  createdAt: string;
  updatedAt: string;
}
