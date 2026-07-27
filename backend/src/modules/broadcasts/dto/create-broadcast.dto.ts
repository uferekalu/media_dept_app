import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

export class CreateBroadcastDto {
  @ApiProperty({ description: 'Service id', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsMongoId()
  service: string;

  @ApiProperty({ description: 'Platform id', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  platform: string;

  @ApiProperty({ example: '2026-08-16T07:55:00.000Z' })
  @IsDateString()
  scheduled_start_time: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=abc123' })
  @IsOptional()
  @IsString()
  external_stream_url?: string;

  @ApiPropertyOptional({ example: 'abc123' })
  @IsOptional()
  @IsString()
  external_video_id?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  peak_viewer_count?: number;

  @ApiPropertyOptional({ example: 'Backup encoder on standby' })
  @IsOptional()
  @IsString()
  notes?: string;
}
