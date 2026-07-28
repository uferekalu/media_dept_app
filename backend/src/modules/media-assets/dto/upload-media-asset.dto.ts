import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { MediaAssetType } from '../../../common/enums';

// Backs POST /media-assets/upload (multipart/form-data) — for PHOTO/GRAPHIC/THUMBNAIL
// only; MediaAssetsService rejects a video type here. No storage_url field — that
// comes from the uploaded file via Cloudinary, never the client.
export class UploadMediaAssetDto {
  @ApiProperty({ enum: MediaAssetType, example: MediaAssetType.PHOTO })
  @IsEnum(MediaAssetType)
  type: MediaAssetType;

  @ApiPropertyOptional({ description: 'Service id, if tied to one', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsOptional()
  @IsMongoId()
  service?: string;

  @ApiProperty({ description: 'Media team member id who uploaded this', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  uploaded_by: string;

  // Multipart form fields are always strings — comma-separated here, split into an
  // array in MediaAssetsService, same reasoning FormData can't cleanly carry a real
  // array without repeating the field name or a JSON-encoded value.
  @ApiPropertyOptional({ example: 'faith series,pastor adeyemi', description: 'Comma-separated tags' })
  @IsOptional()
  @IsString()
  tags?: string;
}
