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

    it('sends the assigned member an SMS', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ ...dto, media_team_member: 'member-id' });

      await service.create(dto);

      expect(termiiService.sendSms).toHaveBeenCalledWith(
        '+2348033334444',
        expect.stringContaining('Tolu Bankole'),
      );
    });

    it('never fails assignment creation if the SMS send itself throws', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ ...dto, media_team_member: 'member-id' });
      termiiService.sendSms.mockRejectedValueOnce(new Error('Termii is down'));

      await expect(service.create(dto)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    function mockExistingAssignment(overrides: Record<string, unknown> = {}) {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'assignment-id',
          service: 'service-id',
          media_team_member: 'old-member-id',
          role: CrewAssignmentRole.CAMERA_1,
          ...overrides,
        }),
      });
    }

    it('reassigning to a different member notifies the newly-assigned member by SMS', async () => {
      mockExistingAssignment();
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'assignment-id',
          service: 'service-id',
          media_team_member: 'member-id', // the new member from mediaTeamMembersService's mock
          role: CrewAssignmentRole.CAMERA_1,
        }),
      });

      await service.update('assignment-id', { media_team_member: 'member-id' });

      expect(termiiService.sendSms).toHaveBeenCalledWith(
        '+2348033334444',
        expect.stringContaining('Tolu Bankole'),
      );
    });

    it('does not send an SMS for an update that leaves the assigned member unchanged', async () => {
      mockExistingAssignment({ media_team_member: 'member-id' });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'assignment-id',
          service: 'service-id',
          media_team_member: 'member-id',
          role: CrewAssignmentRole.CAMERA_1,
          notes: 'Bring the backup battery',
        }),
      });

      await service.update('assignment-id', { notes: 'Bring the backup battery' });

      expect(termiiService.sendSms).not.toHaveBeenCalled();
    });

    it('does not send an SMS when media_team_member is set to the same id it already was', async () => {
      mockExistingAssignment({ media_team_member: 'member-id' });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'assignment-id',
          service: 'service-id',
          media_team_member: 'member-id',
          role: CrewAssignmentRole.CAMERA_1,
        }),
      });

      await service.update('assignment-id', { media_team_member: 'member-id' });

      expect(termiiService.sendSms).not.toHaveBeenCalled();
    });

    it('never fails the reassignment itself if the SMS send throws', async () => {
      mockExistingAssignment();
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'assignment-id',
          service: 'service-id',
          media_team_member: 'member-id',
          role: CrewAssignmentRole.CAMERA_1,
        }),
      });
      termiiService.sendSms.mockRejectedValueOnce(new Error('Termii is down'));

      await expect(
        service.update('assignment-id', { media_team_member: 'member-id' }),
      ).resolves.toBeDefined();
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
