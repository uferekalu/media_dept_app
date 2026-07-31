import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContributionCampaignsService } from './contribution-campaigns.service';
import { ContributionCampaign } from './schemas/contribution-campaign.schema';
import { ContributionCampaignPurposeCategory, ContributionCampaignStatus } from '../../common/enums';
import { EquipmentService } from '../equipment/equipment.service';

describe('ContributionCampaignsService', () => {
  let service: ContributionCampaignsService;
  let equipmentService: { findOne: jest.Mock };
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    equipmentService = { findOne: jest.fn().mockResolvedValue({ _id: 'equipment-id' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionCampaignsService,
        { provide: getModelToken(ContributionCampaign.name), useValue: model },
        { provide: EquipmentService, useValue: equipmentService },
      ],
    }).compile();

    service = moduleRef.get(ContributionCampaignsService);
  });

  describe('create', () => {
    const dto = {
      title: 'Camera Repair Fund',
      purpose_category: ContributionCampaignPurposeCategory.EQUIPMENT_REPAIR,
      equipment: 'equipment-id',
      target_amount: 15000000,
    };

    it('validates the linked equipment exists and derives created_by from the caller, not the body', async () => {
      model.create.mockResolvedValue({ ...dto, created_by: 'member-id' });

      await service.create(dto, 'member-id');

      expect(equipmentService.findOne).toHaveBeenCalledWith('equipment-id');
      expect(model.create).toHaveBeenCalledWith({ ...dto, created_by: 'member-id' });
    });

    it('skips the equipment lookup when no equipment is linked', async () => {
      const { equipment, ...withoutEquipment } = dto;
      model.create.mockResolvedValue(withoutEquipment);

      await service.create(withoutEquipment, 'member-id');

      expect(equipmentService.findOne).not.toHaveBeenCalled();
    });

    it('propagates a NotFoundException if the linked equipment does not exist', async () => {
      equipmentService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto, 'member-id')).rejects.toBeInstanceOf(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    function mockCurrentStatus(status: ContributionCampaignStatus, current_amount = 0) {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          status,
          current_amount,
          save: jest.fn().mockResolvedValue(undefined),
        }),
      });
    }

    it('allows ACTIVE -> COMPLETED', async () => {
      mockCurrentStatus(ContributionCampaignStatus.ACTIVE);

      const result = await service.updateStatus('campaign-id', {
        status: ContributionCampaignStatus.COMPLETED,
      });

      expect(result.status).toBe(ContributionCampaignStatus.COMPLETED);
    });

    it('allows ACTIVE -> CLOSED directly', async () => {
      mockCurrentStatus(ContributionCampaignStatus.ACTIVE);

      const result = await service.updateStatus('campaign-id', {
        status: ContributionCampaignStatus.CLOSED,
      });

      expect(result.status).toBe(ContributionCampaignStatus.CLOSED);
    });

    it('rejects any transition out of the terminal CLOSED status', async () => {
      mockCurrentStatus(ContributionCampaignStatus.CLOSED);

      await expect(
        service.updateStatus('campaign-id', { status: ContributionCampaignStatus.ACTIVE }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects CLOSED -> ACTIVE even indirectly via COMPLETED', async () => {
      mockCurrentStatus(ContributionCampaignStatus.COMPLETED);

      await expect(
        service.updateStatus('campaign-id', { status: ContributionCampaignStatus.ACTIVE }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('rejects a target_amount below what has already been raised', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ current_amount: 5000000, save: jest.fn() }),
      });

      await expect(
        service.update('campaign-id', { target_amount: 1000000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('refuses to delete a campaign that has already raised money', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ current_amount: 5000000 }),
      });

      await expect(service.remove('campaign-id')).rejects.toBeInstanceOf(BadRequestException);
      expect(model.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('deletes a campaign that has raised nothing yet', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ current_amount: 0 }),
      });
      model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.remove('campaign-id');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('campaign-id');
    });
  });
});
