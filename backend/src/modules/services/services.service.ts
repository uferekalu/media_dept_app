import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { BroadcastsService } from '../broadcasts/broadcasts.service';
import {
  BroadcastStatus,
  ServiceStatus,
  StatusLogEntityType,
  VALID_SERVICE_STATUS_TRANSITIONS,
} from '../../common/enums';

// Statuses that mean "this service is actively in the production/distribution pipeline
// right now" — everything past PLANNED (not yet started prep) and short of ARCHIVED
// (fully closed out). Powers GET /services/live-now (brief Section 4B's "Live Now"
// dashboard). Once Phase 4 adds Broadcast, this stays the Service-level signal; the
// dashboard additionally shows each Broadcast's own per-platform status alongside it.
const LIVE_NOW_STATUSES = [
  ServiceStatus.CREW_ASSIGNED,
  ServiceStatus.EQUIPMENT_READY,
  ServiceStatus.LIVE,
  ServiceStatus.ENDED,
  ServiceStatus.RECORDING_PROCESSING,
  ServiceStatus.PUBLISHED,
];

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private readonly statusLogsService: StatusLogsService,
    // Circular with BroadcastsModule: Broadcasts needs Services for referential
    // validation + the rollup write, Services needs Broadcasts for the one check
    // below (reject a manual ENDED while a Broadcast is still LIVE). forwardRef on
    // both sides, per backend/CLAUDE.md's rollup rules and NestJS's documented
    // pattern for this exact shape of mutual dependency.
    @Inject(forwardRef(() => BroadcastsService))
    private readonly broadcastsService: BroadcastsService,
  ) {}

  create(dto: CreateServiceDto): Promise<ServiceDocument> {
    return this.serviceModel.create(dto);
  }

  findAll(): Promise<ServiceDocument[]> {
    return this.serviceModel.find().sort({ date: -1 }).exec();
  }

  findLiveNow(): Promise<ServiceDocument[]> {
    return this.serviceModel
      .find({ status: { $in: LIVE_NOW_STATUSES } })
      .sort({ date: 1 })
      .exec();
  }

  async findOne(id: string): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceDocument> {
    const service = await this.serviceModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async remove(id: string): Promise<void> {
    const result = await this.serviceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Service ${id} not found`);
    }
  }

  // The one guarded path for changing status (brief Section 3 + backend/CLAUDE.md):
  // validate the transition, write it, and log it — the log is the source of truth,
  // Service.status is only a denormalized convenience read off of it.
  async updateStatus(id: string, dto: UpdateServiceStatusDto): Promise<ServiceDocument> {
    const service = await this.findOne(id);
    const allowedNextStatuses = VALID_SERVICE_STATUS_TRANSITIONS[service.status];

    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a service from ${service.status} to ${dto.status}. Valid next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none — this is a terminal status'
        }`,
      );
    }

    // Manual-override guard: don't let a person mark the Service ENDED while a
    // Broadcast is still actively LIVE on some platform — Broadcast state is the
    // source of truth for "is this actually still going out," per backend/CLAUDE.md.
    // The normal path is the automatic rollup (see applyRollupStatus below), which
    // only fires once every Broadcast has genuinely ended.
    if (dto.status === ServiceStatus.ENDED) {
      const broadcasts = await this.broadcastsService.findByService(id);
      const stillLive = broadcasts.some((b) => b.status === BroadcastStatus.LIVE);
      if (stillLive) {
        throw new BadRequestException(
          'Cannot mark this service Ended while a broadcast is still Live on at least one platform.',
        );
      }
    }

    service.status = dto.status;
    await service.save();

    await this.statusLogsService.create({
      entity_type: StatusLogEntityType.SERVICE,
      entity_id: id,
      status: dto.status,
      updated_by: dto.updated_by,
      notes: dto.notes,
    });

    return service;
  }

  // System-driven status write for the Broadcast rollup (backend/CLAUDE.md) — bypasses
  // VALID_SERVICE_STATUS_TRANSITIONS deliberately, since the rollup is allowed to skip
  // steps a manual transition can't (e.g. a Broadcast going Live jumps a still-PLANNED
  // Service straight to LIVE). Never exposed via a public endpoint — only
  // BroadcastsService calls this, immediately after its own guarded status write.
  async applyRollupStatus(id: string, status: ServiceStatus, note: string): Promise<void> {
    const service = await this.findOne(id);
    if (service.status === status) return;

    service.status = status;
    await service.save();

    await this.statusLogsService.create({
      entity_type: StatusLogEntityType.SERVICE,
      entity_id: id,
      status,
      notes: note,
    });
  }
}
