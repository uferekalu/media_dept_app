import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SocialPostStatus } from '../../../common/enums';

export class UpdateSocialPostStatusDto {
  @ApiProperty({ enum: SocialPostStatus, example: SocialPostStatus.SCHEDULED })
  @IsEnum(SocialPostStatus)
  status: SocialPostStatus;
}
