import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSocialPostDto } from './create-social-post.dto';

// posted_by isn't reassignable after creation — same reasoning as
// UpdateRunOfShowItemDto omitting `service`. Status changes go through the dedicated
// guarded PATCH /social-posts/:id/status instead (see UpdateSocialPostStatusDto).
export class UpdateSocialPostDto extends PartialType(
  OmitType(CreateSocialPostDto, ['posted_by'] as const),
) {}
