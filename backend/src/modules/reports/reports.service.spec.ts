import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ServicesService } from '../services/services.service';
import { CrewAssignmentsService } from '../crew-assignments/crew-assignments.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { EquipmentCheckoutsService } from '../equipment-checkouts/equipment-checkouts.service';
import { EquipmentService } from '../equipment/equipment.service';
import { CrewAssignmentStatus, EquipmentCategory } from '../../common/enums';

describe('ReportsService', () => {
  let service: ReportsService;
  let servicesService: { findAll: jest.Mock };
  let crewAssignmentsService: { findAll: jest.Mock };
  let mediaTeamMembersService: { findAll: jest.Mock };
  let equipmentCheckoutsService: { findAll: jest.Mock };
  let equipmentService: { findAll: jest.Mock };

  beforeEach(async () => {
    servicesService = { findAll: jest.fn() };
    crewAssignmentsService = { findAll: jest.fn() };
    mediaTeamMembersService = { findAll: jest.fn() };
    equipmentCheckoutsService = { findAll: jest.fn() };
    equipmentService = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ServicesService, useValue: servicesService },
        { provide: CrewAssignmentsService, useValue: crewAssignmentsService },
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
        { provide: EquipmentCheckoutsService, useValue: equipmentCheckoutsService },
        { provide: EquipmentService, useValue: equipmentService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('servicesPerMonth', () => {
    it('groups services by calendar month and sorts chronologically', async () => {
      servicesService.findAll.mockResolvedValue([
        { date: new Date('2026-07-05T00:00:00.000Z') },
        { date: new Date('2026-07-19T00:00:00.000Z') },
        { date: new Date('2026-08-02T00:00:00.000Z') },
      ]);

      const result = await service.servicesPerMonth();

      expect(result).toEqual([
        { month: '2026-07', count: 2 },
        { month: '2026-08', count: 1 },
      ]);
    });

    it('returns an empty array when there are no services', async () => {
      servicesService.findAll.mockResolvedValue([]);

      expect(await service.servicesPerMonth()).toEqual([]);
    });
  });

  describe('mostActiveCrewMembers', () => {
    it('counts only COMPLETED assignments per member, sorted descending', async () => {
      mediaTeamMembersService.findAll.mockResolvedValue([
        { _id: 'member-1', full_name: 'Tolu Bankole' },
        { _id: 'member-2', full_name: 'Chidi Okafor' },
      ]);
      crewAssignmentsService.findAll.mockResolvedValue([
        { media_team_member: 'member-1', status: CrewAssignmentStatus.COMPLETED },
        { media_team_member: 'member-1', status: CrewAssignmentStatus.COMPLETED },
        { media_team_member: 'member-2', status: CrewAssignmentStatus.COMPLETED },
        { media_team_member: 'member-2', status: CrewAssignmentStatus.PENDING },
      ]);

      const result = await service.mostActiveCrewMembers();

      expect(result).toEqual([
        { media_team_member_id: 'member-1', full_name: 'Tolu Bankole', completed_assignments: 2 },
        { media_team_member_id: 'member-2', full_name: 'Chidi Okafor', completed_assignments: 1 },
      ]);
    });

    it('falls back to a placeholder name if the member record is somehow missing', async () => {
      mediaTeamMembersService.findAll.mockResolvedValue([]);
      crewAssignmentsService.findAll.mockResolvedValue([
        { media_team_member: 'ghost-member', status: CrewAssignmentStatus.COMPLETED },
      ]);

      const result = await service.mostActiveCrewMembers();

      expect(result[0].full_name).toBe('Unknown member');
    });
  });

  describe('equipmentUtilization', () => {
    it('counts checkouts per equipment item, sorted descending', async () => {
      equipmentService.findAll.mockResolvedValue([
        { _id: 'equip-1', name: 'Canon C70 #2', category: EquipmentCategory.CAMERA },
        { _id: 'equip-2', name: 'Shure SM58 Kit A', category: EquipmentCategory.MICROPHONE },
      ]);
      equipmentCheckoutsService.findAll.mockResolvedValue([
        { equipment: 'equip-1' },
        { equipment: 'equip-1' },
        { equipment: 'equip-1' },
        { equipment: 'equip-2' },
      ]);

      const result = await service.equipmentUtilization();

      expect(result).toEqual([
        { equipment_id: 'equip-1', name: 'Canon C70 #2', category: EquipmentCategory.CAMERA, checkout_count: 3 },
        { equipment_id: 'equip-2', name: 'Shure SM58 Kit A', category: EquipmentCategory.MICROPHONE, checkout_count: 1 },
      ]);
    });
  });
});
