import { Injectable } from '@nestjs/common';
import { ServicesService } from '../services/services.service';
import { CrewAssignmentsService } from '../crew-assignments/crew-assignments.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { EquipmentCheckoutsService } from '../equipment-checkouts/equipment-checkouts.service';
import { EquipmentService } from '../equipment/equipment.service';
import { CrewAssignmentStatus, EquipmentCategory } from '../../common/enums';

export interface ServicesPerMonthReportItem {
  month: string; // "2026-07"
  count: number;
}

export interface CrewActivityReportItem {
  media_team_member_id: string;
  full_name: string;
  completed_assignments: number;
}

export interface EquipmentUtilizationReportItem {
  equipment_id: string;
  name: string;
  category: EquipmentCategory;
  checkout_count: number;
}

// Brief Section 4G — simple reports over data that already exists elsewhere in the
// app. Deliberately does everything in application code (fetch each collection's full
// list, group with a plain Map) rather than a Mongo aggregation pipeline: this
// codebase's ref fields (e.g. CrewAssignment.media_team_member,
// EquipmentCheckout.equipment) are stored as plain strings rather than actual
// Types.ObjectId instances despite the schema's declared type (a latent, app-wide
// quirk — see PR-022's notes), which would silently break a `$lookup`-based join. A
// plain string-keyed Map sidesteps that entirely, and at this app's realistic data
// volume (a church media team's services/assignments/checkouts) there's no
// performance reason to reach for aggregation instead.
@Injectable()
export class ReportsService {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly crewAssignmentsService: CrewAssignmentsService,
    private readonly mediaTeamMembersService: MediaTeamMembersService,
    private readonly equipmentCheckoutsService: EquipmentCheckoutsService,
    private readonly equipmentService: EquipmentService,
  ) {}

  async servicesPerMonth(): Promise<ServicesPerMonthReportItem[]> {
    const services = await this.servicesService.findAll();

    const counts = new Map<string, number>();
    for (const service of services) {
      const month = service.date.toISOString().slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // "Most active" = most CrewAssignments actually completed, not just assigned —
  // a PENDING/CONFIRMED assignment doesn't reflect work actually done yet.
  async mostActiveCrewMembers(): Promise<CrewActivityReportItem[]> {
    const [assignments, members] = await Promise.all([
      this.crewAssignmentsService.findAll(),
      this.mediaTeamMembersService.findAll(),
    ]);
    const memberById = new Map(members.map((m) => [m._id.toString(), m]));

    const counts = new Map<string, number>();
    for (const assignment of assignments) {
      if (assignment.status !== CrewAssignmentStatus.COMPLETED) continue;
      const id = assignment.media_team_member.toString();
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([id, completed_assignments]) => ({
        media_team_member_id: id,
        full_name: memberById.get(id)?.full_name ?? 'Unknown member',
        completed_assignments,
      }))
      .sort((a, b) => b.completed_assignments - a.completed_assignments);
  }

  async equipmentUtilization(): Promise<EquipmentUtilizationReportItem[]> {
    const [checkouts, equipment] = await Promise.all([
      this.equipmentCheckoutsService.findAll(),
      this.equipmentService.findAll(),
    ]);
    const equipmentById = new Map(equipment.map((e) => [e._id.toString(), e]));

    const counts = new Map<string, number>();
    for (const checkout of checkouts) {
      const id = checkout.equipment.toString();
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([id, checkout_count]) => ({
        equipment_id: id,
        name: equipmentById.get(id)?.name ?? 'Unknown equipment',
        category: equipmentById.get(id)?.category ?? EquipmentCategory.OTHER,
        checkout_count,
      }))
      .sort((a, b) => b.checkout_count - a.checkout_count);
  }
}
