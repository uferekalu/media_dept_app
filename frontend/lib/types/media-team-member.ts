import type { MediaTeamMemberRole } from './enums';

export interface MediaTeamMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: MediaTeamMemberRole;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}
