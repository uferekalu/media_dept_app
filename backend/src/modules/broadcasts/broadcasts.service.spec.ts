import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { Broadcast } from './schemas/broadcast.schema';
import { BroadcastStatus, ServiceStatus } from '../../common/enums';
import { ServicesService } from '../services/services.service';
import { PlatformsService } from '../platforms/platforms.service';
import { StatusLogsService } from '../status-logs/status-logs.service';

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let servicesService: { findOne: jest.Mock; applyRollupStatus: jest.Mock };
  let platformsService: { findOne: jest.Mock };
  let statusLogsService: { create: jest.Mock };
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    servicesService = {
      findOne: jest.fn().mockResolvedValue({ _id: 'service-id', status: ServiceStatus.PLANNED }),
      applyRollupStatus: jest.fn().mockResolvedValue(undefined),
    };
    platformsService = {
      findOne: jest.fn().mockResolvedValue({ _id: 'platform-id', name: 'YOUTUBE', enabled: true }),
    };
    statusLogsService = { create: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        { provide: getModelToken(Broadcast.name), useValue: model },
        { provide: ServicesService, useValue: servicesService },
        { provide: PlatformsService, useValue: platformsService },
        { provide: StatusLogsService, useValue: statusLogsService },
      ],
    }).compile();

    service = moduleRef.get(BroadcastsService);
  });

  describe('create', () => {
    const dto = {
      service: 'service-id',
      platform: 'platform-id',
      scheduled_start_time: '2026-08-16T07:55:00.000Z',
    };

    it('rejects a broadcast on a disabled platform', async () => {
      platformsService.findOne.mockResolvedValue({ _id: 'platform-id', name: 'YOUTUBE', enabled: false });

      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects a second broadcast for the same service+platform pair', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'existing' }) });

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('creates when the platform is enabled and no duplicate exists', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ ...dto });

      await service.create(dto);

      expect(model.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateStatus', () => {
    function mockCurrentBroadcast(status: BroadcastStatus, overrides: Record<string, unknown> = {}) {
      const broadcast = {
        status,
        service: { toString: () => 'service-id' },
        platform: { toString: () => 'platform-id' },
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(broadcast) });
      return broadcast;
    }

    it('rejects skipping a step (SCHEDULED straight to ENDED)', async () => {
      mockCurrentBroadcast(BroadcastStatus.SCHEDULED);

      await expect(
        service.updateStatus('broadcast-id', { status: BroadcastStatus.ENDED }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(servicesService.applyRollupStatus).not.toHaveBeenCalled();
    });

    it('rolls the Service up to LIVE when a broadcast goes live while the Service is still prepping', async () => {
      mockCurrentBroadcast(BroadcastStatus.SCHEDULED);
      servicesService.findOne.mockResolvedValue({ _id: 'service-id', status: ServiceStatus.CREW_ASSIGNED });

      await service.updateStatus('broadcast-id', { status: BroadcastStatus.LIVE });

      expect(servicesService.applyRollupStatus).toHaveBeenCalledWith(
        'service-id',
        ServiceStatus.LIVE,
        expect.any(String),
      );
    });

    it('does not roll up to LIVE if the Service is already LIVE', async () => {
      mockCurrentBroadcast(BroadcastStatus.SCHEDULED);
      servicesService.findOne.mockResolvedValue({ _id: 'service-id', status: ServiceStatus.LIVE });

      await service.updateStatus('broadcast-id', { status: BroadcastStatus.LIVE });

      expect(servicesService.applyRollupStatus).not.toHaveBeenCalled();
    });

    it('rolls the Service up to ENDED once every enabled platform broadcast has ended', async () => {
      mockCurrentBroadcast(BroadcastStatus.LIVE);
      servicesService.findOne.mockResolvedValue({ _id: 'service-id', status: ServiceStatus.LIVE });
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { status: BroadcastStatus.ENDED, platform: { toString: () => 'platform-id' } },
          ]),
        }),
      });

      await service.updateStatus('broadcast-id', { status: BroadcastStatus.ENDED });

      expect(servicesService.applyRollupStatus).toHaveBeenCalledWith(
        'service-id',
        ServiceStatus.ENDED,
        expect.any(String),
      );
    });

    it('does not roll up to ENDED while a sibling broadcast is still LIVE', async () => {
      mockCurrentBroadcast(BroadcastStatus.LIVE);
      servicesService.findOne.mockResolvedValue({ _id: 'service-id', status: ServiceStatus.LIVE });
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { status: BroadcastStatus.ENDED, platform: { toString: () => 'platform-id' } },
            { status: BroadcastStatus.LIVE, platform: { toString: () => 'other-platform-id' } },
          ]),
        }),
      });
      platformsService.findOne.mockImplementation((id: string) =>
        Promise.resolve({ _id: id, name: 'PLATFORM', enabled: true }),
      );

      await service.updateStatus('broadcast-id', { status: BroadcastStatus.ENDED });

      expect(servicesService.applyRollupStatus).not.toHaveBeenCalled();
    });

    it('ignores a disabled platform sibling when checking whether every broadcast has ended', async () => {
      mockCurrentBroadcast(BroadcastStatus.LIVE);
      servicesService.findOne.mockResolvedValue({ _id: 'service-id', status: ServiceStatus.LIVE });
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { status: BroadcastStatus.ENDED, platform: { toString: () => 'platform-id' } },
            { status: BroadcastStatus.SCHEDULED, platform: { toString: () => 'disabled-platform-id' } },
          ]),
        }),
      });
      platformsService.findOne.mockImplementation((id: string) =>
        Promise.resolve({ _id: id, name: 'PLATFORM', enabled: id !== 'disabled-platform-id' }),
      );

      await service.updateStatus('broadcast-id', { status: BroadcastStatus.ENDED });

      expect(servicesService.applyRollupStatus).toHaveBeenCalledWith(
        'service-id',
        ServiceStatus.ENDED,
        expect.any(String),
      );
    });
  });
});
