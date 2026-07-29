import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EquipmentCheckoutsService } from './equipment-checkouts.service';
import { CreateEquipmentCheckoutDto } from './dto/create-equipment-checkout.dto';
import { UpdateEquipmentCheckoutDto } from './dto/update-equipment-checkout.dto';
import { ReturnEquipmentCheckoutDto } from './dto/return-equipment-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaTeamMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Every route requires login; write routes are ADMIN/DIRECTOR-only per
// backend/CLAUDE.md — reading is open to any authenticated role.
@ApiTags('equipment-checkouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment-checkouts')
export class EquipmentCheckoutsController {
  constructor(private readonly equipmentCheckoutsService: EquipmentCheckoutsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Check out a piece of equipment — also marks it CHECKED_OUT' })
  @ApiBadRequestResponse({ description: 'The equipment is not currently available' })
  create(@Body() dto: CreateEquipmentCheckoutDto) {
    return this.equipmentCheckoutsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all equipment checkouts (the checkout log)' })
  findAll() {
    return this.equipmentCheckoutsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single equipment checkout' })
  @ApiNotFoundResponse({ description: 'Equipment checkout not found' })
  findOne(@Param('id') id: string) {
    return this.equipmentCheckoutsService.findOne(id);
  }

  @Patch(':id/return')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Mark equipment returned — also reverts it to AVAILABLE' })
  @ApiBadRequestResponse({ description: 'This checkout has already been returned' })
  @ApiNotFoundResponse({ description: 'Equipment checkout not found' })
  returnEquipment(@Param('id') id: string, @Body() dto: ReturnEquipmentCheckoutDto) {
    return this.equipmentCheckoutsService.returnEquipment(id, dto);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update checkout details (reassign, reschedule return, notes)' })
  @ApiNotFoundResponse({ description: 'Equipment checkout not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentCheckoutDto) {
    return this.equipmentCheckoutsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a closed-out (already returned) checkout record' })
  @ApiBadRequestResponse({ description: 'This equipment has not been returned yet' })
  @ApiNotFoundResponse({ description: 'Equipment checkout not found' })
  remove(@Param('id') id: string) {
    return this.equipmentCheckoutsService.remove(id);
  }
}
