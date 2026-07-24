import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceType } from '../../../common/enums';

export class CreateServiceDto {
  @ApiProperty({ example: '2026 Easter Revival — Day 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.REVIVAL })
  @IsEnum(ServiceType)
  type: ServiceType;

  @ApiProperty({ example: '2026-04-05' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '2026-04-05T08:00:00.000Z' })
  @IsDateString()
  start_time: string;

  @ApiProperty({ example: '2026-04-05T10:30:00.000Z' })
  @IsDateString()
  end_time: string;

  @ApiPropertyOptional({ example: 'Rev. Dr. John Adebayo' })
  @IsOptional()
  @IsString()
  speaker?: string;

  @ApiPropertyOptional({ example: 'Faith Series Pt. 3' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiProperty({ example: 'Main Auditorium' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiPropertyOptional({ example: 'First day of the Easter Revival programme' })
  @IsOptional()
  @IsString()
  description?: string;
}
