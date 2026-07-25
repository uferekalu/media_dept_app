import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RunOfShowService } from './run-of-show.service';
import { RunOfShowController } from './run-of-show.controller';
import { RunOfShowItem, RunOfShowItemSchema } from './schemas/run-of-show-item.schema';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RunOfShowItem.name, schema: RunOfShowItemSchema }]),
    ServicesModule,
  ],
  controllers: [RunOfShowController],
  providers: [RunOfShowService],
})
export class RunOfShowModule {}
