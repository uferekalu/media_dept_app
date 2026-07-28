// Mirrors backend/src/modules/auth — LoginDto, AuthService's LoginResult and
// AuthenticatedMediaTeamMember.
import type { MediaTeamMemberRole } from './enums';

export interface AuthenticatedMediaTeamMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: MediaTeamMemberRole;
}

export interface LoginInput {
  phone_number: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  media_team_member: AuthenticatedMediaTeamMember;
}
