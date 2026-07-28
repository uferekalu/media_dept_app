import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsService } from './media-assets.service';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { ServicesModule } from '../services/services.module';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }]),
    CloudinaryModule,
    ServicesModule,
    MediaTeamMembersModule,
  ],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
