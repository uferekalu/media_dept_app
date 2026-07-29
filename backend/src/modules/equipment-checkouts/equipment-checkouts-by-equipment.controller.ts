import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EquipmentCheckoutsService } from './equipment-checkouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Lives in EquipmentCheckoutsModule rather than EquipmentModule for the same
// sibling-controller reasoning as the Phase 3/4 nested read routes — keeps the
// convention consistent even though this particular pair doesn't need forwardRef
// (EquipmentModule has no reason to depend back on EquipmentCheckoutsModule).
// Open to any authenticated role — a checkout history is general operational info.
@ApiTags('equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment')
export class EquipmentCheckoutsByEquipmentController {
  constructor(private readonly equipmentCheckoutsService: EquipmentCheckoutsService) {}

  @Get(':id/checkouts')
  @ApiOperation({ summary: "List a piece of equipment's checkout history" })
  findByEquipment(@Param('id') id: string) {
    return this.equipmentCheckoutsService.findByEquipment(id);
  }
}
