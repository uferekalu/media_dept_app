import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateEquipmentCheckoutDto {
  @ApiProperty({ description: 'Equipment id', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsMongoId()
  equipment: string;

  @ApiPropertyOptional({ description: 'Service id, if this checkout is tied to one', example: '665f1a2b3c4d5e6f7a8b9c11' })
  @IsOptional()
  @IsMongoId()
  service?: string;

  @ApiProperty({ description: 'Media team member id', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  checked_out_to: string;

  @ApiProperty({ example: '2026-08-16T18:00:00.000Z' })
  @IsDateString()
  expected_return_at: string;

  @ApiPropertyOptional({ example: 'Includes two spare batteries' })
  @IsOptional()
  @IsString()
  notes?: string;
}
