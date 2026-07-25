import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// name is not editable — Platform identity is fixed by the seeded enum value (brief
// Section 2). Only these two fields are ever updated after seeding.
export class UpdatePlatformDto {
  @ApiPropertyOptional({ example: 'UC1234567890' })
  @IsOptional()
  @IsString()
  external_channel_or_page_id?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
