import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './schemas/service.schema';
import { ServiceStatus, ServiceType } from '../../common/enums';

describe('ServicesService', () => {
  let service: ServicesService;
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

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ServicesService, { provide: getModelToken(Service.name), useValue: model }],
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
});
