import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrewAssignmentsController } from './crew-assignments.controller';
import { ServiceCrewAssignmentsController } from './service-crew-assignments.controller';
import { MediaTeamMemberAssignmentsController } from './media-team-member-assignments.controller';
import { CrewAssignmentsService } from './crew-assignments.service';
import { CrewAssignment, CrewAssignmentSchema } from './schemas/crew-assignment.schema';
import { ServicesModule } from '../services/services.module';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CrewAssignment.name, schema: CrewAssignmentSchema }]),
    ServicesModule,
    MediaTeamMembersModule,
  ],
  controllers: [
    CrewAssignmentsController,
    ServiceCrewAssignmentsController,
    MediaTeamMemberAssignmentsController,
  ],
  providers: [CrewAssignmentsService],
  exports: [CrewAssignmentsService],
})
export class CrewAssignmentsModule {}
