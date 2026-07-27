import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EquipmentCheckoutsService } from './equipment-checkouts.service';

// Lives in EquipmentCheckoutsModule rather than EquipmentModule for the same
// sibling-controller reasoning as the Phase 3/4 nested read routes — keeps the
// convention consistent even though this particular pair doesn't need forwardRef
// (EquipmentModule has no reason to depend back on EquipmentCheckoutsModule).
@ApiTags('equipment')
@Controller('equipment')
export class EquipmentCheckoutsByEquipmentController {
  constructor(private readonly equipmentCheckoutsService: EquipmentCheckoutsService) {}

  @Get(':id/checkouts')
  @ApiOperation({ summary: "List a piece of equipment's checkout history" })
  findByEquipment(@Param('id') id: string) {
    return this.equipmentCheckoutsService.findByEquipment(id);
  }
}
