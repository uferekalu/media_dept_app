import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

// Deliberately does NOT include `type` or `storage_url` — an asset's underlying file/
// link and type are immutable after creation (same precedent as
// protocol_dept_app's photo upload, which replaces rather than edits). This DTO only
// covers re-tagging and re-linking to a different service.
export class UpdateMediaAssetDto {
  @ApiPropertyOptional({ description: 'Service id, if tied to one', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsOptional()
  @IsMongoId()
  service?: string;

  @ApiPropertyOptional({ type: [String], example: ['faith series', 'pastor adeyemi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
