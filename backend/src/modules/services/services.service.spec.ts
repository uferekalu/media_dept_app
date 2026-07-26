import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './schemas/service.schema';
import { ServiceStatus, ServiceType } from '../../common/enums';
import { StatusLogsService } from '../status-logs/status-logs.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let statusLogsService: { create: jest.Mock };
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
    statusLogsService = { create: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getModelToken(Service.name), useValue: model },
        { provide: StatusLogsService, useValue: statusLogsService },
      ],
    }).compile();

    service = moduleRef.get(ServicesService);
  });

  it('creates a service without requiring a status (defaults on the schema)', async () => {
    model.create.mockResolvedValue({ name: 'Sunday Service', status: ServiceStatus.PLANNED });

    await service.create({
      name: 'Sunday Service',
      type: ServiceType.SUNDAY_SERVICE,
      date: '2026-08-02',
      start_time: '2026-08-02T08:00:00.000Z',
      end_time: '2026-08-02T10:00:00.000Z',
      venue: 'Main Auditorium',
    });

    expect(model.create).toHaveBeenCalledTimes(1);
    expect(model.create.mock.calls[0][0].status).toBeUndefined();
  });

  it('throws NotFoundException when no service matches the id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when updating a service that does not exist', async () => {
    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.update('missing-id', { venue: 'New Venue' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updateStatus', () => {
    function mockCurrentStatus(status: ServiceStatus) {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status, save: jest.fn().mockResolvedValue(undefined) }),
      });
    }

    it('allows a valid forward transition and writes a StatusLog entry', async () => {
      mockCurrentStatus(ServiceStatus.PLANNED);

      const result = await service.updateStatus('service-id', {
        status: ServiceStatus.CREW_ASSIGNED,
      });

      expect(result.status).toBe(ServiceStatus.CREW_ASSIGNED);
      expect(statusLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ entity_id: 'service-id', status: ServiceStatus.CREW_ASSIGNED }),
      );
    });

    it('rejects skipping a step (PLANNED straight to LIVE)', async () => {
      mockCurrentStatus(ServiceStatus.PLANNED);

      await expect(
        service.updateStatus('service-id', { status: ServiceStatus.LIVE }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(statusLogsService.create).not.toHaveBeenCalled();
    });

    it('rejects any transition out of the terminal ARCHIVED status', async () => {
      mockCurrentStatus(ServiceStatus.ARCHIVED);

      await expect(
        service.updateStatus('service-id', { status: ServiceStatus.PLANNED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findLiveNow', () => {
    it('queries only the in-pipeline statuses, excluding PLANNED and ARCHIVED', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      model.find.mockReturnValue({ sort: sortMock });

      await service.findLiveNow();

      const queryArg = model.find.mock.calls[0][0];
      expect(queryArg.status.$in).not.toContain(ServiceStatus.PLANNED);
      expect(queryArg.status.$in).not.toContain(ServiceStatus.ARCHIVED);
      expect(queryArg.status.$in).toContain(ServiceStatus.LIVE);
    });
  });
});
