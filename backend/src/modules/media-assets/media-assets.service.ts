import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { MediaAsset, MediaAssetDocument } from './schemas/media-asset.schema';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto';
import { CreateMediaAssetLinkDto } from './dto/create-media-asset-link.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { IMAGE_MEDIA_ASSET_TYPES, MediaAssetType, VIDEO_MEDIA_ASSET_TYPES } from '../../common/enums';

export interface FindMediaAssetsFilter {
  service?: string;
  type?: MediaAssetType;
  tag?: string;
}

@Injectable()
export class MediaAssetsService {
  constructor(
    @InjectModel(MediaAsset.name) private mediaAssetModel: Model<MediaAssetDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly servicesService: ServicesService,
    private readonly mediaTeamMembersService: MediaTeamMembersService,
  ) {}

  // PHOTO/GRAPHIC/THUMBNAIL only — a real Cloudinary upload. See enums.ts's
  // VIDEO_MEDIA_ASSET_TYPES comment for why video assets use createLink() instead.
  async uploadImage(file: Express.Multer.File, dto: UploadMediaAssetDto): Promise<MediaAssetDocument> {
    if (!IMAGE_MEDIA_ASSET_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `${dto.type} isn't an uploadable image type — use POST /media-assets with a storage_url instead`,
      );
    }

    await this.mediaTeamMembersService.findOne(dto.uploaded_by);
    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }

    let uploadResult;
    try {
      uploadResult = await this.cloudinaryService.uploadImage(file.buffer, 'media-assets');
    } catch (error) {
      // Cloudinary rejects non-image bytes (e.g. a text file renamed to .jpg) with its
      // own {message, http_code: 400} shape — surface that as a clean 400 instead of
      // letting it fall through as an unhandled 500.
      const cloudinaryMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Upload failed';
      throw new BadRequestException(`Cloudinary rejected this file: ${cloudinaryMessage}`);
    }

    return this.mediaAssetModel.create({
      type: dto.type,
      service: dto.service,
      uploaded_by: dto.uploaded_by,
      storage_url: uploadResult.secure_url,
      tags: dto.tags ? dto.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  }

  // VIDEO_CLIP/FULL_RECORDING only — a pasted URL, no file upload at all.
  async createLink(dto: CreateMediaAssetLinkDto): Promise<MediaAssetDocument> {
    if (!VIDEO_MEDIA_ASSET_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `${dto.type} is an image type — use POST /media-assets/upload with a file instead`,
      );
    }

    await this.mediaTeamMembersService.findOne(dto.uploaded_by);
    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }

    return this.mediaAssetModel.create(dto);
  }

  // Powers the Media Asset Library's search/filter (brief Section 4D) — by service and
  // type/tag directly; filtering by date/speaker/series happens client-side by
  // cross-referencing the already-fetched services list, same pattern the Status
  // Timeline screen uses to resolve a Broadcast's platform name.
  findAll(filter: FindMediaAssetsFilter): Promise<MediaAssetDocument[]> {
    const query: FilterQuery<MediaAssetDocument> = {};
    if (filter.service) query.service = filter.service;
    if (filter.type) query.type = filter.type;
    if (filter.tag) query.tags = filter.tag;

    return this.mediaAssetModel.find(query).sort({ uploaded_at: -1 }).exec();
  }

  // Powers the VOD Archive (full recordings only, most recent first).
  findFullRecordings(): Promise<MediaAssetDocument[]> {
    return this.mediaAssetModel
      .find({ type: MediaAssetType.FULL_RECORDING })
      .sort({ uploaded_at: -1 })
      .exec();
  }

  async findOne(id: string): Promise<MediaAssetDocument> {
    const asset = await this.mediaAssetModel.findById(id).exec();
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} not found`);
    }
    return asset;
  }

  async update(id: string, dto: UpdateMediaAssetDto): Promise<MediaAssetDocument> {
    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }
    const asset = await this.mediaAssetModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} not found`);
    }
    return asset;
  }

  // Only removes the database record, same precedent as protocol_dept_app's
  // removePhoto() — doesn't call Cloudinary's destroy API, so an image-backed asset's
  // file stays in Cloudinary as an orphan. Acceptable for now; revisit if storage
  // usage/cost ever becomes a real concern.
  async remove(id: string): Promise<void> {
    const result = await this.mediaAssetModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Media asset ${id} not found`);
    }
  }
}
