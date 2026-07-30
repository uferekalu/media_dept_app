import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RunOfShowItem, RunOfShowItemDocument } from './schemas/run-of-show-item.schema';
import { CreateRunOfShowItemDto } from './dto/create-run-of-show-item.dto';
import { UpdateRunOfShowItemDto } from './dto/update-run-of-show-item.dto';
import { DuplicateRunOfShowDto } from './dto/duplicate-run-of-show.dto';
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

  // Brief Section 4A's "duplicate as a starting template" feature. A straight copy of
  // each segment's absolute scheduled_start_time would almost always fall outside the
  // target service's window (different date/start_time) and fail
  // assertWithinServiceWindow — instead, each segment is copied at the same *offset*
  // from its own service's start_time, so a "Praise & Worship, 10 minutes in" segment
  // lands 10 minutes into whichever service it's copied onto. Requires the target to
  // still be empty (order values would otherwise collide/need renumbering, and "insert
  // a template into an already-planned run-of-show" isn't the use case this covers —
  // that's just building the run-of-show manually).
  async duplicateFromService(dto: DuplicateRunOfShowDto): Promise<RunOfShowItemDocument[]> {
    if (dto.source_service === dto.target_service) {
      throw new BadRequestException('source_service and target_service must be different');
    }

    const [sourceService, targetService, existingTargetCount] = await Promise.all([
      this.servicesService.findOne(dto.source_service),
      this.servicesService.findOne(dto.target_service),
      this.runOfShowItemModel.countDocuments({ service: dto.target_service }).exec(),
    ]);

    if (existingTargetCount > 0) {
      throw new BadRequestException(
        'target_service already has run-of-show items — duplicate only works into an empty run-of-show',
      );
    }

    const sourceItems = await this.findForService(dto.source_service);
    if (sourceItems.length === 0) {
      throw new BadRequestException('source_service has no run-of-show items to duplicate');
    }

    const newItems = sourceItems.map((item) => {
      const offsetMs = item.scheduled_start_time.getTime() - sourceService.start_time.getTime();
      const scheduled_start_time = new Date(targetService.start_time.getTime() + offsetMs);

      if (
        scheduled_start_time.getTime() < targetService.start_time.getTime() ||
        scheduled_start_time.getTime() > targetService.end_time.getTime()
      ) {
        throw new BadRequestException(
          `"${item.segment_name}" would fall outside the target service's window once shifted — target_service's start_time/end_time window is too short for this template`,
        );
      }

      return {
        // Stored (and queried, e.g. countDocuments()/findForService() above) as a
        // plain string, not an actual Types.ObjectId instance — matching how every
        // other `create()`-inserted document in this app ends up on disk (confirmed
        // directly against Mongo: existing RunOfShowItem/CrewAssignment documents all
        // have `service` as a BSON string, not ObjectId, despite the schema declaring
        // `type: Types.ObjectId`). insertMany()'s stricter TS typing doesn't accept a
        // bare string here the way create()'s looser typing does, hence the cast — but
        // passing a real Types.ObjectId instead would silently break every other query
        // in this codebase that filters run-of-show items by a string service id.
        service: dto.target_service as unknown as Types.ObjectId,
        order: item.order,
        segment_name: item.segment_name,
        scheduled_start_time,
        duration_minutes: item.duration_minutes,
        graphics_notes: item.graphics_notes,
        notes: item.notes,
      };
    });

    return this.runOfShowItemModel.insertMany(newItems);
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
