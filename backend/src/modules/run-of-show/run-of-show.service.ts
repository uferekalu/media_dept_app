import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RunOfShowItem, RunOfShowItemDocument } from './schemas/run-of-show-item.schema';
import { CreateRunOfShowItemDto } from './dto/create-run-of-show-item.dto';
import { UpdateRunOfShowItemDto } from './dto/update-run-of-show-item.dto';
import { ServicesService } from '../services/services.service';

@Injectable()
export class RunOfShowService {
  constructor(
    @InjectModel(RunOfShowItem.name) private runOfShowItemModel: Model<RunOfShowItemDocument>,
    private readonly servicesService: ServicesService,
  ) {}

  async create(dto: CreateRunOfShowItemDto): Promise<RunOfShowItemDocument> {
    await this.assertWithinServiceWindow(dto.service, dto.scheduled_start_time);
    return this.runOfShowItemModel.create(dto);
  }

  findForService(serviceId: string): Promise<RunOfShowItemDocument[]> {
    return this.runOfShowItemModel.find({ service: serviceId }).sort({ order: 1 }).exec();
  }

  async findOne(id: string): Promise<RunOfShowItemDocument> {
    const item = await this.runOfShowItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Run-of-show item ${id} not found`);
    }
    return item;
  }

  async update(id: string, dto: UpdateRunOfShowItemDto): Promise<RunOfShowItemDocument> {
    if (dto.scheduled_start_time) {
      const existing = await this.findOne(id);
      await this.assertWithinServiceWindow(existing.service.toString(), dto.scheduled_start_time);
    }

    const item = await this.runOfShowItemModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) {
      throw new NotFoundException(`Run-of-show item ${id} not found`);
    }
    return item;
  }

  async remove(id: string): Promise<void> {
    const result = await this.runOfShowItemModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Run-of-show item ${id} not found`);
    }
  }

  // Per backend/CLAUDE.md's API-conventions validation requirement: a segment's
  // scheduled start must fall within its parent Service's start_time/end_time window.
  private async assertWithinServiceWindow(
    serviceId: string,
    scheduledStartTime: string,
  ): Promise<void> {
    const service = await this.servicesService.findOne(serviceId);
    const start = new Date(scheduledStartTime).getTime();
    if (start < service.start_time.getTime() || start > service.end_time.getTime()) {
      throw new BadRequestException(
        `scheduled_start_time must fall within the service's window (${service.start_time.toISOString()} – ${service.end_time.toISOString()})`,
      );
    }
  }
}
