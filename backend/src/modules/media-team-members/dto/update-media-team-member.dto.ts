import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMediaTeamMemberDto } from './create-media-team-member.dto';

// Password changes go through a dedicated endpoint once Auth (Phase 7) exists — never
// through the general update, same pattern as protocol_dept_app.
export class UpdateMediaTeamMemberDto extends PartialType(
  OmitType(CreateMediaTeamMemberDto, ['password'] as const),
) {}
