import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CrewAssignmentsService } from './crew-assignments.service';
import { CrewAssignment } from './schemas/crew-assignment.schema';
import { CrewAssignmentRole, CrewAssignmentStatus } from '../../common/enums';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { TermiiService } from '../../common/termii/termii.service';

describe('CrewAssignmentsService', () => {
  let service: CrewAssignmentsService;
  let servicesService: { findOne: jest.Mock };
  let mediaTeamMembersService: { findOne: jest.Mock };
  let termiiService: { sendSms: jest.Mock };
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
      findOne: jest.fn().mockResolvedValue({ _id: 'service-id', name: 'Sunday Service' }),
    };
    mediaTeamMembersService = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: 'member-id', full_name: 'Tolu Bankole', phone_number: '+2348033334444' }),
    };
    termiiService = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CrewAssignmentsService,
        { provide: getModelToken(CrewAssignment.name), useValue: model },
        { provide: ServicesService, useValue: servicesService },
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
        { provide: TermiiService, useValue: termiiService },
      ],
    }).compile();

    service = moduleRef.get(CrewAssignmentsService);
  });

  describe('create', () => {
    const dto = {
      service: 'service-id',
      media_team_member: 'member-id',
      role: CrewAssignmentRole.CAMERA_1,
      call_time: '2026-08-09T07:00:00.000Z',
    };

    it('validates the service and member exist before creating', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ ...dto });

      await service.create(dto);

      expect(servicesService.findOne).toHaveBeenCalledWith('service-id');
      expect(mediaTeamMembersService.findOne).toHaveBeenCalledWith('member-id');
      expect(model.create).toHaveBeenCalledWith(dto);
    });

    it('rejects a second assignment for the same role on the same service', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'existing' }) });

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    function mockCurrentStatus(status: CrewAssignmentStatus) {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status, save: jest.fn().mockResolvedValue(undefined) }),
      });
    }

    it('allows a valid forward transition', async () => {
      mockCurrentStatus(CrewAssignmentStatus.PENDING);

      const result = await service.updateStatus('assignment-id', {
        status: CrewAssignmentStatus.CONFIRMED,
      });

      expect(result.status).toBe(CrewAssignmentStatus.CONFIRMED);
    });

    it('rejects skipping a step (PENDING straight to COMPLETED)', async () => {
      mockCurrentStatus(CrewAssignmentStatus.PENDING);

      await expect(
        service.updateStatus('assignment-id', { status: CrewAssignmentStatus.COMPLETED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects any transition out of the terminal COMPLETED status', async () => {
      mockCurrentStatus(CrewAssignmentStatus.COMPLETED);

      await expect(
        service.updateStatus('assignment-id', { status: CrewAssignmentStatus.PENDING }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
