import { SetMetadata } from '@nestjs/common';
import { MediaTeamMemberRole } from '../enums';

export const ROLES_KEY = 'roles';

// Marks a route (or an entire controller) as restricted to the given roles — read by
// RolesGuard, which must run after JwtAuthGuard so `request.user` is populated. Not
// applied to any real endpoint yet (Phase 7 is staged across PRs to avoid breaking the
// currently-unauthenticated frontend mid-phase) — see backend/CLAUDE.md.
export const Roles = (...roles: MediaTeamMemberRole[]) => SetMetadata(ROLES_KEY, roles);
