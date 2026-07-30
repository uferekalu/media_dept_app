import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SocialPostsService } from './social-posts.service';
import { SocialPost } from './schemas/social-post.schema';
import { SocialPostStatus } from '../../common/enums';
import { MediaAssetsService } from '../media-assets/media-assets.service';
import { PlatformsService } from '../platforms/platforms.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';

describe('SocialPostsService', () => {
  let service: SocialPostsService;
  let mediaAssetsService: { findOne: jest.Mock };
  let platformsService: { findOne: jest.Mock };
  let mediaTeamMembersService: { findOne: jest.Mock };
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    mediaAssetsService = { findOne: jest.fn().mockResolvedValue({ _id: 'asset-id' }) };
    platformsService = { findOne: jest.fn().mockResolvedValue({ _id: 'platform-id' }) };
    mediaTeamMembersService = { findOne: jest.fn().mockResolvedValue({ _id: 'member-id' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SocialPostsService,
        { provide: getModelToken(SocialPost.name), useValue: model },
        { provide: MediaAssetsService, useValue: mediaAssetsService },
        { provide: PlatformsService, useValue: platformsService },
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
      ],
    }).compile();

    service = moduleRef.get(SocialPostsService);
  });

  describe('create', () => {
    const dto = {
      media_asset: 'asset-id',
      platform: 'platform-id',
      caption: 'Highlights!',
      scheduled_time: '2026-08-09T15:00:00.000Z',
      posted_by: 'member-id',
    };

    it('validates the media asset, platform, and poster exist before creating', async () => {
      model.create.mockResolvedValue({ ...dto });

      await service.create(dto);

      expect(mediaAssetsService.findOne).toHaveBeenCalledWith('asset-id');
      expect(platformsService.findOne).toHaveBeenCalledWith('platform-id');
      expect(mediaTeamMembersService.findOne).toHaveBeenCalledWith('member-id');
      expect(model.create).toHaveBeenCalledWith(dto);
    });

    it('propagates a NotFoundException if the media asset does not exist', async () => {
      mediaAssetsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    function mockCurrentStatus(status: SocialPostStatus) {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status, save: jest.fn().mockResolvedValue(undefined) }),
      });
    }

    it('allows DRAFT -> SCHEDULED without setting published_time', async () => {
      mockCurrentStatus(SocialPostStatus.DRAFT);

      const result = await service.updateStatus('post-id', { status: SocialPostStatus.SCHEDULED });

      expect(result.status).toBe(SocialPostStatus.SCHEDULED);
      expect(result.published_time).toBeUndefined();
    });

    it('allows DRAFT -> PUBLISHED directly (posting immediately) and stamps published_time', async () => {
      mockCurrentStatus(SocialPostStatus.DRAFT);

      const result = await service.updateStatus('post-id', { status: SocialPostStatus.PUBLISHED });

      expect(result.status).toBe(SocialPostStatus.PUBLISHED);
      expect(result.published_time).toBeInstanceOf(Date);
    });

    it('allows SCHEDULED -> PUBLISHED and stamps published_time', async () => {
      mockCurrentStatus(SocialPostStatus.SCHEDULED);

      const result = await service.updateStatus('post-id', { status: SocialPostStatus.PUBLISHED });

      expect(result.status).toBe(SocialPostStatus.PUBLISHED);
      expect(result.published_time).toBeInstanceOf(Date);
    });

    it('rejects any transition out of the terminal PUBLISHED status', async () => {
      mockCurrentStatus(SocialPostStatus.PUBLISHED);

      await expect(
        service.updateStatus('post-id', { status: SocialPostStatus.DRAFT }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('filters by platform and status when provided', async () => {
      const exec = jest.fn().mockResolvedValue([]);
      const sort = jest.fn().mockReturnValue({ exec });
      model.find.mockReturnValue({ sort });

      await service.findAll({ platform: 'platform-id', status: SocialPostStatus.SCHEDULED });

      expect(model.find).toHaveBeenCalledWith({
        platform: 'platform-id',
        status: SocialPostStatus.SCHEDULED,
      });
    });

    it('queries with no filters when none are provided', async () => {
      const exec = jest.fn().mockResolvedValue([]);
      const sort = jest.fn().mockReturnValue({ exec });
      model.find.mockReturnValue({ sort });

      await service.findAll({});

      expect(model.find).toHaveBeenCalledWith({});
    });
  });
});
