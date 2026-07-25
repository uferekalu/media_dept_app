import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRunOfShowItemDto } from './create-run-of-show-item.dto';

// service isn't reassignable after creation — moving a segment to a different Service
// isn't a real workflow, it'd just be created fresh there.
export class UpdateRunOfShowItemDto extends PartialType(
  OmitType(CreateRunOfShowItemDto, ['service'] as const),
) {}
