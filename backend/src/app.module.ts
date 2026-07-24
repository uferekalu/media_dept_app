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

// Phase 1 — foundation only: schemas + REST CRUD for the five entities below. Status
// enforcement (Phase 2), CrewAssignment (Phase 3), Broadcast (Phase 4), Equipment
// (Phase 5), MediaAsset (Phase 6), and Auth (Phase 7) are not wired up yet — see
// docs/MEDIA_APP_BRIEF.md Section 7.
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
