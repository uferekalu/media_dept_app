import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentCheckout, EquipmentCheckoutDocument } from './schemas/equipment-checkout.schema';
import { CreateEquipmentCheckoutDto } from './dto/create-equipment-checkout.dto';
import { UpdateEquipmentCheckoutDto } from './dto/update-equipment-checkout.dto';
import { ReturnEquipmentCheckoutDto } from './dto/return-equipment-checkout.dto';
import { EquipmentService } from '../equipment/equipment.service';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { EquipmentCurrentStatus } from '../../common/enums';

@Injectable()
export class EquipmentCheckoutsService {
  constructor(
    @InjectModel(EquipmentCheckout.name)
    private equipmentCheckoutModel: Model<EquipmentCheckoutDocument>,
    private readonly equipmentService: EquipmentService,
    private readonly servicesService: ServicesService,
    private readonly mediaTeamMembersService: MediaTeamMembersService,
  ) {}

  async create(dto: CreateEquipmentCheckoutDto): Promise<EquipmentCheckoutDocument> {
    // Referential integrity: a bad id 404s here instead of silently creating a
    // dangling reference.
    const equipment = await this.equipmentService.findOne(dto.equipment);
    await this.mediaTeamMembersService.findOne(dto.checked_out_to);
    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }

    if (equipment.current_status !== EquipmentCurrentStatus.AVAILABLE) {
      throw new BadRequestException(
        `${equipment.name} is not available for checkout (current status: ${equipment.current_status})`,
      );
    }

    if (new Date(dto.expected_return_at) <= new Date()) {
      throw new BadRequestException('expected_return_at must be in the future');
    }

    const checkout = await this.equipmentCheckoutModel.create(dto);
    await this.equipmentService.setCurrentStatus(dto.equipment, EquipmentCurrentStatus.CHECKED_OUT);
    return checkout;
  }

  findAll(): Promise<EquipmentCheckoutDocument[]> {
    return this.equipmentCheckoutModel.find().sort({ checked_out_at: -1 }).exec();
  }

  // Powers a per-item checkout history view on the Equipment Inventory screen.
  findByEquipment(equipmentId: string): Promise<EquipmentCheckoutDocument[]> {
    return this.equipmentCheckoutModel
      .find({ equipment: equipmentId })
      .sort({ checked_out_at: -1 })
      .exec();
  }

  async findOne(id: string): Promise<EquipmentCheckoutDocument> {
    const checkout = await this.equipmentCheckoutModel.findById(id).exec();
    if (!checkout) {
      throw new NotFoundException(`Equipment checkout ${id} not found`);
    }
    return checkout;
  }

  async update(id: string, dto: UpdateEquipmentCheckoutDto): Promise<EquipmentCheckoutDocument> {
    if (dto.equipment) {
      await this.equipmentService.findOne(dto.equipment);
    }
    if (dto.checked_out_to) {
      await this.mediaTeamMembersService.findOne(dto.checked_out_to);
    }
    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }

    const checkout = await this.equipmentCheckoutModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!checkout) {
      throw new NotFoundException(`Equipment checkout ${id} not found`);
    }
    return checkout;
  }

  // Only ever removes a *closed-out* checkout — deleting an active one would leave the
  // Equipment permanently stuck at CHECKED_OUT with no record of who has it.
  async remove(id: string): Promise<void> {
    const checkout = await this.findOne(id);
    if (!checkout.returned_at) {
      throw new BadRequestException(
        'This equipment has not been returned yet — return it before deleting the checkout record.',
      );
    }
    await this.equipmentCheckoutModel.findByIdAndDelete(id).exec();
  }

  // Marks the checkout closed and reverts the Equipment to AVAILABLE — the two things
  // must happen together, so this is a single service method rather than a plain
  // field update on the checkout alone.
  async returnEquipment(
    id: string,
    dto: ReturnEquipmentCheckoutDto,
  ): Promise<EquipmentCheckoutDocument> {
    const checkout = await this.findOne(id);
    if (checkout.returned_at) {
      throw new BadRequestException('This equipment has already been returned.');
    }

    checkout.returned_at = new Date();
    if (dto.notes !== undefined) {
      checkout.notes = dto.notes;
    }
    await checkout.save();

    await this.equipmentService.setCurrentStatus(
      checkout.equipment.toString(),
      EquipmentCurrentStatus.AVAILABLE,
    );

    return checkout;
  }
}
