import type { MediaTeamMemberRole } from '@/lib/types/enums';

// Mirrors backend/src/common/enums.ts (MediaTeamMemberRole).
export const MEDIA_TEAM_MEMBER_ROLE_LABELS: Record<MediaTeamMemberRole, string> = {
  ADMIN: 'Admin',
  DIRECTOR: 'Director',
  MEMBER: 'Member',
};
