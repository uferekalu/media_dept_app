import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RunOfShowService } from './run-of-show.service';
import { RunOfShowItem } from './schemas/run-of-show-item.schema';
import { ServicesService } from '../services/services.service';

describe('RunOfShowService', () => {
  let service: RunOfShowService;
  let model: {
    countDocuments: jest.Mock;
    insertMany: jest.Mock;
    find: jest.Mock;
  };
  let servicesService: { findOne: jest.Mock };

  const sourceService = {
    _id: '6620a1f2c3d4e5f6a7b8c9d0',
    start_time: new Date('2026-04-05T08:00:00.000Z'),
    end_time: new Date('2026-04-05T10:00:00.000Z'),
  };
  const targetService = {
    _id: '6620a1f2c3d4e5f6a7b8c9d1',
    start_time: new Date('2026-04-12T09:00:00.000Z'),
    end_time: new Date('2026-04-12T11:00:00.000Z'),
  };

  function mockSourceItems(items: Array<{ segment_name: string; scheduled_start_time: Date }>) {
    const sorted = {
      exec: jest.fn().mockResolvedValue(
        items.map((i, idx) => ({
          order: idx + 1,
          segment_name: i.segment_name,
          scheduled_start_time: i.scheduled_start_time,
          duration_minutes: 15,
          graphics_notes: undefined,
          notes: undefined,
        })),
      ),
    };
    model.find.mockReturnValue({ sort: jest.fn().mockReturnValue(sorted) });
  }

  beforeEach(async () => {
    model = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      insertMany: jest.fn().mockImplementation((items) => Promise.resolve(items)),
      find: jest.fn(),
    };
    servicesService = {
      findOne: jest.fn().mockImplementation((id: string) =>
        Promise.resolve(id === sourceService._id ? sourceService : targetService),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunOfShowService,
        { provide: getModelToken(RunOfShowItem.name), useValue: model },
        { provide: ServicesService, useValue: servicesService },
      ],
    }).compile();

    service = module.get<RunOfShowService>(RunOfShowService);
  });

  describe('duplicateFromService', () => {
    const dto = { source_service: sourceService._id, target_service: targetService._id };

    it('rejects when source and target are the same service', async () => {
      await expect(
        service.duplicateFromService({ source_service: 'a', target_service: 'a' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the target service already has run-of-show items', async () => {
      model.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(2) });

      await expect(service.duplicateFromService(dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects when the source service has no items to duplicate', async () => {
      mockSourceItems([]);

      await expect(service.duplicateFromService(dto)).rejects.toThrow(BadRequestException);
    });

    it('shifts each segment by its offset from the source start_time onto the target start_time', async () => {
      // 30 minutes and 90 minutes into the source service.
      mockSourceItems([
        { segment_name: 'Praise & Worship', scheduled_start_time: new Date('2026-04-05T08:30:00.000Z') },
        { segment_name: 'Sermon', scheduled_start_time: new Date('2026-04-05T09:30:00.000Z') },
      ]);

      const result = await service.duplicateFromService(dto);

      expect(model.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          service: targetService._id,
          order: 1,
          segment_name: 'Praise & Worship',
          scheduled_start_time: new Date('2026-04-12T09:30:00.000Z'),
        }),
        expect.objectContaining({
          service: targetService._id,
          order: 2,
          segment_name: 'Sermon',
          scheduled_start_time: new Date('2026-04-12T10:30:00.000Z'),
        }),
      ]);
      expect(result).toHaveLength(2);
    });

    it('rejects when a shifted segment would fall outside the target service window', async () => {
      // 3 hours into an 8am-10am source service — fine there, but the target service
      // (9am-11am) is also only 2 hours long, so +3h from 9am falls outside it.
      mockSourceItems([
        { segment_name: 'Late segment', scheduled_start_time: new Date('2026-04-05T11:00:00.000Z') },
      ]);

      await expect(service.duplicateFromService(dto)).rejects.toThrow(BadRequestException);
      expect(model.insertMany).not.toHaveBeenCalled();
    });
  });
});
