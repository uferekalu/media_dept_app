import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentCheckoutDto } from './create-equipment-checkout.dto';

// Deliberately does NOT include `returned_at` — that can only be set through
// EquipmentCheckoutsService.returnEquipment(), which also reverts the Equipment's
// current_status back to AVAILABLE. This DTO covers correcting the expected return
// date, reassigning who it's checked out to, and notes.
export class UpdateEquipmentCheckoutDto extends PartialType(CreateEquipmentCheckoutDto) {}
