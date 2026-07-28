import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { MediaAssetsService } from './media-assets.service';
import { MediaAsset } from './schemas/media-asset.schema';
import { MediaAssetType } from '../../common/enums';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let cloudinaryService: { uploadImage: jest.Mock };
  let servicesService: { findOne: jest.Mock };
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
    cloudinaryService = {
      uploadImage: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/x/image/upload/y.jpg' }),
    };
    servicesService = { findOne: jest.fn().mockResolvedValue({ _id: 'service-id' }) };
    mediaTeamMembersService = { findOne: jest.fn().mockResolvedValue({ _id: 'member-id' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAssetsService,
        { provide: getModelToken(MediaAsset.name), useValue: model },
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: ServicesService, useValue: servicesService },
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
      ],
    }).compile();

    service = moduleRef.get(MediaAssetsService);
  });

  describe('uploadImage', () => {
    const file = { buffer: Buffer.from('fake') } as Express.Multer.File;

    it('rejects a video type on the upload path', async () => {
      await expect(
        service.uploadImage(file, {
          type: MediaAssetType.FULL_RECORDING,
          uploaded_by: 'member-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('uploads to Cloudinary and parses comma-separated tags for an image type', async () => {
      model.create.mockResolvedValue({});

      await service.uploadImage(file, {
        type: MediaAssetType.PHOTO,
        uploaded_by: 'member-id',
        tags: 'faith series, pastor adeyemi',
      });

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file.buffer, 'media-assets');
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storage_url: 'https://res.cloudinary.com/x/image/upload/y.jpg',
          tags: ['faith series', 'pastor adeyemi'],
        }),
      );
    });
  });

  describe('createLink', () => {
    it('rejects an image type on the link path', async () => {
      await expect(
        service.createLink({
          type: MediaAssetType.PHOTO,
          storage_url: 'https://youtube.com/watch?v=abc',
          uploaded_by: 'member-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('creates a link-backed asset for a video type without touching Cloudinary', async () => {
      const dto = {
        type: MediaAssetType.FULL_RECORDING,
        storage_url: 'https://youtube.com/watch?v=abc',
        uploaded_by: 'member-id',
      };
      model.create.mockResolvedValue(dto);

      await service.createLink(dto);

      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
      expect(model.create).toHaveBeenCalledWith(dto);
    });
  });
});
