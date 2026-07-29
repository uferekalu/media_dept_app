import type { MediaTeamMemberRole } from './enums';

export interface MediaTeamMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: MediaTeamMemberRole;
  image_url?: string;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

// No `password` — that's the dedicated PATCH /auth/change-password instead of the
// general profile update, mirroring UpdateMediaTeamMemberDto on the backend.
export interface UpdateMediaTeamMemberInput {
  full_name?: string;
  phone_number?: string;
  role?: MediaTeamMemberRole;
  skills?: string[];
}
