import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EquipmentCheckoutsController } from './equipment-checkouts.controller';
import { EquipmentCheckoutsByEquipmentController } from './equipment-checkouts-by-equipment.controller';
import { EquipmentCheckoutsService } from './equipment-checkouts.service';
import { EquipmentCheckout, EquipmentCheckoutSchema } from './schemas/equipment-checkout.schema';
import { EquipmentModule } from '../equipment/equipment.module';
import { ServicesModule } from '../services/services.module';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EquipmentCheckout.name, schema: EquipmentCheckoutSchema }]),
    EquipmentModule,
    ServicesModule,
    MediaTeamMembersModule,
  ],
  controllers: [EquipmentCheckoutsController, EquipmentCheckoutsByEquipmentController],
  providers: [EquipmentCheckoutsService],
  exports: [EquipmentCheckoutsService],
})
export class EquipmentCheckoutsModule {}
