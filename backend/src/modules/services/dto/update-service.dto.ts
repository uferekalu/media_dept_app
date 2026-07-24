import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

// status is deliberately absent from CreateServiceDto/UpdateServiceDto — it always
// starts at ServiceStatus.PLANNED (the schema default) and, from Phase 2 on, changes
// only through a dedicated guarded PATCH /services/:id/status endpoint, never through
// this general update.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
