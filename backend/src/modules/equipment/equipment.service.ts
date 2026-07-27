import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentCurrentStatus } from '../../common/enums';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name) private equipmentModel: Model<EquipmentDocument>,
  ) {}

  create(dto: CreateEquipmentDto): Promise<EquipmentDocument> {
    return this.equipmentModel.create(dto);
  }

  findAll(): Promise<EquipmentDocument[]> {
    return this.equipmentModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<EquipmentDocument> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment) {
      throw new NotFoundException(`Equipment ${id} not found`);
    }
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<EquipmentDocument> {
    const equipment = await this.equipmentModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!equipment) {
      throw new NotFoundException(`Equipment ${id} not found`);
    }
    return equipment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.equipmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Equipment ${id} not found`);
    }
  }

  // Internal, system-driven write used by EquipmentCheckoutsService's checkout/return
  // flow — bypasses the general update() DTO entirely since it's a side effect of a
  // different action, not a direct edit. Never exposed via its own endpoint.
  async setCurrentStatus(id: string, status: EquipmentCurrentStatus): Promise<void> {
    const equipment = await this.findOne(id);
    equipment.current_status = status;
    await equipment.save();
  }
}
