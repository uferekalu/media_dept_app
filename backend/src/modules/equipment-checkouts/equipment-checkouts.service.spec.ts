import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { EquipmentCheckoutsService } from './equipment-checkouts.service';
import { EquipmentCheckout } from './schemas/equipment-checkout.schema';
import { EquipmentCurrentStatus } from '../../common/enums';
import { EquipmentService } from '../equipment/equipment.service';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';

describe('EquipmentCheckoutsService', () => {
  let service: EquipmentCheckoutsService;
  let equipmentService: { findOne: jest.Mock; setCurrentStatus: jest.Mock };
  let servicesService: { findOne: jest.Mock };
  let mediaTeamMembersService: { findOne: jest.Mock };
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  const futureDate = new Date(Date.now() + 86400000).toISOString();

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    equipmentService = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'equipment-id',
        name: 'Canon C70 #2',
        current_status: EquipmentCurrentStatus.AVAILABLE,
      }),
      setCurrentStatus: jest.fn().mockResolvedValue(undefined),
    };
    servicesService = { findOne: jest.fn().mockResolvedValue({ _id: 'service-id' }) };
    mediaTeamMembersService = { findOne: jest.fn().mockResolvedValue({ _id: 'member-id' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentCheckoutsService,
        { provide: getModelToken(EquipmentCheckout.name), useValue: model },
        { provide: EquipmentService, useValue: equipmentService },
        { provide: ServicesService, useValue: servicesService },
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
      ],
    }).compile();

    service = moduleRef.get(EquipmentCheckoutsService);
  });

  describe('create', () => {
    const dto = {
      equipment: 'equipment-id',
      checked_out_to: 'member-id',
      expected_return_at: futureDate,
    };

    it('rejects checking out equipment that is not AVAILABLE', async () => {
      equipmentService.findOne.mockResolvedValue({
        _id: 'equipment-id',
        name: 'Canon C70 #2',
        current_status: EquipmentCurrentStatus.CHECKED_OUT,
      });

      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects an expected_return_at that is not in the future', async () => {
      await expect(
        service.create({ ...dto, expected_return_at: new Date(Date.now() - 1000).toISOString() }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates the checkout and marks the equipment CHECKED_OUT', async () => {
      model.create.mockResolvedValue({ ...dto });

      await service.create(dto);

      expect(model.create).toHaveBeenCalledWith(dto);
      expect(equipmentService.setCurrentStatus).toHaveBeenCalledWith(
        'equipment-id',
        EquipmentCurrentStatus.CHECKED_OUT,
      );
    });
  });

  describe('returnEquipment', () => {
    function mockCheckout(overrides: Record<string, unknown> = {}) {
      const checkout = {
        equipment: { toString: () => 'equipment-id' },
        returned_at: undefined,
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(checkout) });
      return checkout;
    }

    it('sets returned_at and reverts the equipment to AVAILABLE', async () => {
      mockCheckout();

      const result = await service.returnEquipment('checkout-id', {});

      expect(result.returned_at).toBeInstanceOf(Date);
      expect(equipmentService.setCurrentStatus).toHaveBeenCalledWith(
        'equipment-id',
        EquipmentCurrentStatus.AVAILABLE,
      );
    });

    it('rejects returning something already returned', async () => {
      mockCheckout({ returned_at: new Date() });

      await expect(service.returnEquipment('checkout-id', {})).rejects.toBeInstanceOf(BadRequestException);
      expect(equipmentService.setCurrentStatus).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('rejects deleting a checkout that has not been returned yet', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ returned_at: undefined }) });

      await expect(service.remove('checkout-id')).rejects.toBeInstanceOf(BadRequestException);
      expect(model.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('allows deleting a checkout that has been returned', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ returned_at: new Date() }) });
      model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.remove('checkout-id');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('checkout-id');
    });
  });
});
