import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { MediaTeamMembersModule } from './modules/media-team-members/media-team-members.module';
import { ServicesModule } from './modules/services/services.module';
import { RunOfShowModule } from './modules/run-of-show/run-of-show.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { StatusLogsModule } from './modules/status-logs/status-logs.module';
import { CrewAssignmentsModule } from './modules/crew-assignments/crew-assignments.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { EquipmentCheckoutsModule } from './modules/equipment-checkouts/equipment-checkouts.module';

// Phases 1-5 wired up so far: foundation schemas/CRUD, Service status enforcement,
// CrewAssignment, Broadcast (with the Service rollup), and Equipment/
// EquipmentCheckout. MediaAsset (Phase 6) and Auth (Phase 7) are not wired up yet —
// see docs/MEDIA_APP_BRIEF.md Section 7.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUri'),
      }),
    }),
    MediaTeamMembersModule,
    ServicesModule,
    RunOfShowModule,
    PlatformsModule,
    StatusLogsModule,
    CrewAssignmentsModule,
    BroadcastsModule,
    EquipmentModule,
    EquipmentCheckoutsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
