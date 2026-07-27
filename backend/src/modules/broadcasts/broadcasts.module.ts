import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BroadcastsController } from './broadcasts.controller';
import { ServiceBroadcastsController } from './service-broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { Broadcast, BroadcastSchema } from './schemas/broadcast.schema';
import { ServicesModule } from '../services/services.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { StatusLogsModule } from '../status-logs/status-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Broadcast.name, schema: BroadcastSchema }]),
    // Circular with ServicesModule — see ServicesService's constructor comment.
    forwardRef(() => ServicesModule),
    PlatformsModule,
    StatusLogsModule,
  ],
  controllers: [BroadcastsController, ServiceBroadcastsController],
  providers: [BroadcastsService],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
