import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaTeamMembersService } from './media-team-members.service';
import { MediaTeamMembersController } from './media-team-members.controller';
import { MediaTeamMember, MediaTeamMemberSchema } from './schemas/media-team-member.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MediaTeamMember.name, schema: MediaTeamMemberSchema }]),
  ],
  controllers: [MediaTeamMembersController],
  providers: [MediaTeamMembersService],
  exports: [MediaTeamMembersService],
})
export class MediaTeamMembersModule {}
