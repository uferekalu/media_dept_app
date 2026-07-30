import type { EquipmentCategory } from './enums';

// Mirrors backend/src/modules/reports/reports.service.ts's return interfaces exactly.

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
