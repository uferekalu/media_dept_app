import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SocialPost, SocialPostDocument } from './schemas/social-post.schema';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { UpdateSocialPostDto } from './dto/update-social-post.dto';
import { UpdateSocialPostStatusDto } from './dto/update-social-post-status.dto';
import { MediaAssetsService } from '../media-assets/media-assets.service';
import { PlatformsService } from '../platforms/platforms.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { SocialPostStatus, VALID_SOCIAL_POST_STATUS_TRANSITIONS } from '../../common/enums';

@Injectable()
export class SocialPostsService {
  constructor(
    @InjectModel(SocialPost.name) private socialPostModel: Model<SocialPostDocument>,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly platformsService: PlatformsService,
    private readonly mediaTeamMembersService: MediaTeamMembersService,
  ) {}

  // Referential integrity: a bad id 404s here instead of silently creating a dangling
  // reference, same pattern as CrewAssignmentsService.create().
  async create(dto: CreateSocialPostDto): Promise<SocialPostDocument> {
    await this.mediaAssetsService.findOne(dto.media_asset);
    await this.platformsService.findOne(dto.platform);
    await this.mediaTeamMembersService.findOne(dto.posted_by);

    return this.socialPostModel.create(dto);
  }

  findAll(filters: { platform?: string; status?: SocialPostStatus }): Promise<SocialPostDocument[]> {
    const query: Record<string, string> = {};
    if (filters.platform) query.platform = filters.platform;
    if (filters.status) query.status = filters.status;
    return this.socialPostModel.find(query).sort({ scheduled_time: 1 }).exec();
  }

  async findOne(id: string): Promise<SocialPostDocument> {
    const post = await this.socialPostModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Social post ${id} not found`);
    }
    return post;
  }

  async update(id: string, dto: UpdateSocialPostDto): Promise<SocialPostDocument> {
    if (dto.media_asset) {
      await this.mediaAssetsService.findOne(dto.media_asset);
    }
    if (dto.platform) {
      await this.platformsService.findOne(dto.platform);
    }

    const post = await this.socialPostModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!post) {
      throw new NotFoundException(`Social post ${id} not found`);
    }
    return post;
  }

  async remove(id: string): Promise<void> {
    const result = await this.socialPostModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Social post ${id} not found`);
    }
  }

  // The guarded status-transition endpoint — mirrors CrewAssignmentsService.updateStatus().
  // published_time is never user-supplied (see the schema's comment): it's stamped here,
  // automatically, the moment a post actually moves to PUBLISHED.
  async updateStatus(id: string, dto: UpdateSocialPostStatusDto): Promise<SocialPostDocument> {
    const post = await this.findOne(id);

    const allowedNextStatuses = VALID_SOCIAL_POST_STATUS_TRANSITIONS[post.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a social post from ${post.status} to ${dto.status}. Valid next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none — this post is already published'
        }`,
      );
    }

    post.status = dto.status;
    if (dto.status === SocialPostStatus.PUBLISHED) {
      post.published_time = new Date();
    }
    await post.save();
    return post;
  }
}
