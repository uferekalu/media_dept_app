import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateSocialPostDto {
  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  media_asset: string;

  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d1' })
  @IsMongoId()
  platform: string;

  @ApiProperty({ example: 'Highlights from this week\'s service! #FaithSeries' })
  @IsString()
  @IsNotEmpty()
  caption: string;

  @ApiProperty({ example: '2026-04-06T15:00:00.000Z' })
  @IsDateString()
  scheduled_time: string;

  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d2', description: 'Media team member id' })
  @IsMongoId()
  posted_by: string;
}
