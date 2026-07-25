import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusLogEntityType } from '../../../common/enums';

export class CreateStatusLogDto {
  @ApiProperty({ enum: StatusLogEntityType, example: StatusLogEntityType.SERVICE })
  @IsEnum(StatusLogEntityType)
  entity_type: StatusLogEntityType;

  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  entity_id: string;

  @ApiProperty({ example: 'PLANNED' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: '6620a1f2c3d4e5f6a7b8c9d1' })
  @IsOptional()
  @IsMongoId()
  updated_by?: string;

  @ApiPropertyOptional({ example: 'Initial creation' })
  @IsOptional()
  @IsString()
  notes?: string;
}
