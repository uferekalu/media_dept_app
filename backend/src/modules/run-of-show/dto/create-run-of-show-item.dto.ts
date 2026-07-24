import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRunOfShowItemDto {
  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  service: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ example: 'Praise & Worship' })
  @IsString()
  @IsNotEmpty()
  segment_name: string;

  @ApiProperty({ example: '2026-04-05T08:00:00.000Z' })
  @IsDateString()
  scheduled_start_time: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  duration_minutes: number;

  @ApiPropertyOptional({ example: 'Lyrics for 3 songs' })
  @IsOptional()
  @IsString()
  graphics_notes?: string;

  @ApiPropertyOptional({ example: 'Worship team leads' })
  @IsOptional()
  @IsString()
  notes?: string;
}
