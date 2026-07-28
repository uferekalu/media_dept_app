import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsMongoId, IsOptional, IsString, IsUrl } from 'class-validator';
import { MediaAssetType } from '../../../common/enums';

// Backs the plain JSON POST /media-assets — for VIDEO_CLIP/FULL_RECORDING only (a
// pasted URL, e.g. the YouTube link — see enums.ts's VIDEO_MEDIA_ASSET_TYPES comment
// for why video never goes through an actual Cloudinary upload here);
// MediaAssetsService rejects an image type on this endpoint.
export class CreateMediaAssetLinkDto {
  @ApiProperty({ enum: MediaAssetType, example: MediaAssetType.FULL_RECORDING })
  @IsEnum(MediaAssetType)
  type: MediaAssetType;

  @ApiProperty({ example: 'https://youtube.com/watch?v=abc123' })
  @IsUrl()
  storage_url: string;

  @ApiPropertyOptional({ description: 'Service id, if tied to one', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsOptional()
  @IsMongoId()
  service?: string;

  @ApiProperty({ description: 'Media team member id who added this', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  uploaded_by: string;

  @ApiPropertyOptional({ type: [String], example: ['faith series', 'pastor adeyemi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
