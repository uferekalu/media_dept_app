import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Platform, PlatformDocument } from './schemas/platform.schema';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformName } from '../../common/enums';

@Injectable()
export class PlatformsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformsService.name);

  constructor(
    @InjectModel(Platform.name) private platformModel: Model<PlatformDocument>,
  ) {}

  // Seeds the fixed platform list on first boot only — brief Section 2 treats Platform
  // as a small, mostly-fixed reference list, not something created ad hoc per service.
  async onModuleInit(): Promise<void> {
    const count = await this.platformModel.countDocuments().exec();
    if (count > 0) return;

    await this.platformModel.insertMany(
      Object.values(PlatformName).map((name) => ({ name, enabled: true })),
    );
    this.logger.log(`Seeded ${Object.values(PlatformName).length} platforms`);
  }

  findAll(): Promise<PlatformDocument[]> {
    return this.platformModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<PlatformDocument> {
    const platform = await this.platformModel.findById(id).exec();
    if (!platform) {
      throw new NotFoundException(`Platform ${id} not found`);
    }
    return platform;
  }

  async update(id: string, dto: UpdatePlatformDto): Promise<PlatformDocument> {
    const platform = await this.platformModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!platform) {
      throw new NotFoundException(`Platform ${id} not found`);
    }
    return platform;
  }
}
