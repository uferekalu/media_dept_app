import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialPostsController } from './social-posts.controller';
import { SocialPostsService } from './social-posts.service';
import { SocialPost, SocialPostSchema } from './schemas/social-post.schema';
import { MediaAssetsModule } from '../media-assets/media-assets.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SocialPost.name, schema: SocialPostSchema }]),
    MediaAssetsModule,
    PlatformsModule,
    MediaTeamMembersModule,
  ],
  controllers: [SocialPostsController],
  providers: [SocialPostsService],
  exports: [SocialPostsService],
})
export class SocialPostsModule {}
