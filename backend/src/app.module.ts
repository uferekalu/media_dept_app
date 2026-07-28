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
import { MediaAssetsModule } from './modules/media-assets/media-assets.module';
import { AuthModule } from './modules/auth/auth.module';

// Phases 1-6 wired up: foundation schemas/CRUD, Service status enforcement,
// CrewAssignment, Broadcast (with the Service rollup), Equipment/EquipmentCheckout,
// and MediaAsset. Phase 7 (Auth) infrastructure is wired up here (login/signup/JWT +
// RolesGuard) but not yet applied as a guard to any of the modules above — see
// docs/MEDIA_APP_BRIEF.md Section 7 and backend/CLAUDE.md's staging note.
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
    MediaAssetsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
