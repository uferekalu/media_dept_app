import { PartialType } from '@nestjs/swagger';
import { CreateBroadcastDto } from './create-broadcast.dto';

// Deliberately does NOT include `status` — that can only change through
// BroadcastsService.updateStatus() via UpdateBroadcastStatusDto, which enforces the
// transition guard and triggers the Service rollup.
export class UpdateBroadcastDto extends PartialType(CreateBroadcastDto) {}
