import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Every route requires login; no @Roles() restriction — reports are for department-wide
// visibility (brief Section 4G reads as "what happened," not an elevated-only
// management tool), same reasoning as the Team Directory being open to every role.
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('services-per-month')
  @ApiOperation({ summary: 'Count of services produced per calendar month' })
  servicesPerMonth() {
    return this.reportsService.servicesPerMonth();
  }

  @Get('crew-activity')
  @ApiOperation({ summary: 'Most active crew members, by completed crew assignments' })
  crewActivity() {
    return this.reportsService.mostActiveCrewMembers();
  }

  @Get('equipment-utilization')
  @ApiOperation({ summary: 'Most checked-out equipment items' })
  equipmentUtilization() {
    return this.reportsService.equipmentUtilization();
  }
}
