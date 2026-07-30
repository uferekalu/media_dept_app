import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ServicesModule } from '../services/services.module';
import { CrewAssignmentsModule } from '../crew-assignments/crew-assignments.module';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';
import { EquipmentCheckoutsModule } from '../equipment-checkouts/equipment-checkouts.module';
import { EquipmentModule } from '../equipment/equipment.module';

// No own Mongoose schema — Reports is a pure read/aggregation layer over data owned by
// the other modules below.
@Module({
  imports: [
    ServicesModule,
    CrewAssignmentsModule,
    MediaTeamMembersModule,
    EquipmentCheckoutsModule,
    EquipmentModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
