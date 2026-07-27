import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentDto } from './create-equipment.dto';

// Includes condition/current_status (both optional in Create too) — this is how a
// director marks an item IN_REPAIR or fixes its condition; there's no separate guarded
// status endpoint for Equipment (brief Section 3 doesn't define a state machine for
// it). The checkout/return flow (EquipmentCheckoutsService) also writes current_status
// as a side effect — both paths are legitimate here.
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
