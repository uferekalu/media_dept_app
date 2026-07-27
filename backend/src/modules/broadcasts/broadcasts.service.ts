import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Broadcast, BroadcastDocument } from './schemas/broadcast.schema';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { UpdateBroadcastStatusDto } from './dto/update-broadcast-status.dto';
import { ServicesService } from '../services/services.service';
import { PlatformsService } from '../platforms/platforms.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import {
  BroadcastStatus,
  ServiceStatus,
  StatusLogEntityType,
  VALID_BROADCAST_STATUS_TRANSITIONS,
} from '../../common/enums';

const MONGO_DUPLICATE_KEY_ERROR = 11000;

// Service statuses a Broadcast going Live is allowed to jump the parent Service out
// of — see updateStatus()'s rollup comment.
const PRE_LIVE_SERVICE_STATUSES = [
  ServiceStatus.PLANNED,
  ServiceStatus.CREW_ASSIGNED,
  ServiceStatus.EQUIPMENT_READY,
];

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectModel(Broadcast.name) private broadcastModel: Model<BroadcastDocument>,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
    private readonly platformsService: PlatformsService,
    private readonly statusLogsService: StatusLogsService,
  ) {}

  async create(dto: CreateBroadcastDto): Promise<BroadcastDocument> {
    // Referential integrity: a bad id 404s here instead of silently creating a
    // dangling reference.
    await this.servicesService.findOne(dto.service);
    const platform = await this.platformsService.findOne(dto.platform);

    if (!platform.enabled) {
      throw new BadRequestException(
        `${platform.name} is disabled and can't have a broadcast created against it`,
      );
    }

    const existing = await this.broadcastModel
      .findOne({ service: dto.service, platform: dto.platform })
      .exec();
    if (existing) {
      throw new ConflictException(
        `A broadcast for this service on ${platform.name} already exists`,
      );
    }

    try {
      return await this.broadcastModel.create(dto);
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  findAll(): Promise<BroadcastDocument[]> {
    return this.broadcastModel.find().sort({ scheduled_start_time: 1 }).exec();
  }

  // Powers the Live Now dashboard's per-platform breakdown and the Status Timeline.
  findByService(serviceId: string): Promise<BroadcastDocument[]> {
    return this.broadcastModel.find({ service: serviceId }).sort({ scheduled_start_time: 1 }).exec();
  }

  async findOne(id: string): Promise<BroadcastDocument> {
    const broadcast = await this.broadcastModel.findById(id).exec();
    if (!broadcast) {
      throw new NotFoundException(`Broadcast ${id} not found`);
    }
    return broadcast;
  }

  async update(id: string, dto: UpdateBroadcastDto): Promise<BroadcastDocument> {
    const existing = await this.findOne(id);

    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }
    if (dto.platform) {
      const platform = await this.platformsService.findOne(dto.platform);
      if (!platform.enabled) {
        throw new BadRequestException(
          `${platform.name} is disabled and can't have a broadcast created against it`,
        );
      }
    }

    const effectiveService = dto.service ?? existing.service.toString();
    const effectivePlatform = dto.platform ?? existing.platform.toString();
    if (dto.service || dto.platform) {
      const conflict = await this.broadcastModel
        .findOne({ _id: { $ne: id }, service: effectiveService, platform: effectivePlatform })
        .exec();
      if (conflict) {
        throw new ConflictException('A broadcast for this service on this platform already exists');
      }
    }

    let broadcast: BroadcastDocument | null;
    try {
      broadcast = await this.broadcastModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
    if (!broadcast) {
      throw new NotFoundException(`Broadcast ${id} not found`);
    }
    return broadcast;
  }

  async remove(id: string): Promise<void> {
    const result = await this.broadcastModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Broadcast ${id} not found`);
    }
  }

  // The guarded status-transition endpoint, plus the Service rollup — the trickiest
  // logic in the whole backend per backend/CLAUDE.md. Order matters: write and log
  // this Broadcast's own status first, then decide whether the parent Service needs
  // to move too.
  async updateStatus(id: string, dto: UpdateBroadcastStatusDto): Promise<BroadcastDocument> {
    const broadcast = await this.findOne(id);

    const allowedNextStatuses = VALID_BROADCAST_STATUS_TRANSITIONS[broadcast.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a broadcast from ${broadcast.status} to ${dto.status}. Valid next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none — this broadcast is fully published'
        }`,
      );
    }

    broadcast.status = dto.status;
    if (dto.notes !== undefined) {
      broadcast.notes = dto.notes;
    }
    await broadcast.save();

    await this.statusLogsService.create({
      entity_type: StatusLogEntityType.BROADCAST,
      entity_id: id,
      status: dto.status,
      notes: dto.notes,
    });

    const serviceId = broadcast.service.toString();

    if (dto.status === BroadcastStatus.LIVE) {
      // First broadcast to go live pulls a still-prepping Service straight into LIVE —
      // deliberately skips PLANNED/CREW_ASSIGNED/EQUIPMENT_READY's normal step order,
      // since the service genuinely is live now regardless of whether every prep step
      // was recorded.
      const service = await this.servicesService.findOne(serviceId);
      if (PRE_LIVE_SERVICE_STATUSES.includes(service.status)) {
        await this.servicesService.applyRollupStatus(
          serviceId,
          ServiceStatus.LIVE,
          'Auto-advanced: a broadcast went live',
        );
      }
    }

    if (dto.status === BroadcastStatus.ENDED) {
      // Only advance the Service once every *enabled* platform's broadcast has ended —
      // a disabled platform's stale/never-used broadcast shouldn't block the rollup.
      const siblings = await this.findByService(serviceId);
      const enabledSiblings: BroadcastDocument[] = [];
      for (const sibling of siblings) {
        const platform = await this.platformsService.findOne(sibling.platform.toString());
        if (platform.enabled) enabledSiblings.push(sibling);
      }
      const allEnded = enabledSiblings.every((b) => b.status === BroadcastStatus.ENDED || b.status === BroadcastStatus.PUBLISHED);

      const service = await this.servicesService.findOne(serviceId);
      if (allEnded && service.status === ServiceStatus.LIVE) {
        await this.servicesService.applyRollupStatus(
          serviceId,
          ServiceStatus.ENDED,
          'Auto-advanced: every broadcast has ended',
        );
      }
    }

    return broadcast;
  }

  private translateDuplicateKeyError(error: unknown): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException('A broadcast for this service on this platform already exists');
    }
    return error as Error;
  }
}
