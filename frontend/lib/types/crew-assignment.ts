import type { CrewAssignmentRole, CrewAssignmentStatus } from './enums';

export interface CrewAssignment {
  _id: string;
  service: string;
  media_team_member: string;
  role: CrewAssignmentRole;
  call_time: string;
  status: CrewAssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
