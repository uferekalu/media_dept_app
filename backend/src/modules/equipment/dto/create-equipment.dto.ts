import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EquipmentCategory, EquipmentCondition, EquipmentCurrentStatus } from '../../../common/enums';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Canon C70 #2' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EquipmentCategory, example: EquipmentCategory.CAMERA })
  @IsEnum(EquipmentCategory)
  category: EquipmentCategory;

  @ApiPropertyOptional({ example: 'SN-00482913' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ enum: EquipmentCondition, example: EquipmentCondition.GOOD })
  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @ApiPropertyOptional({ enum: EquipmentCurrentStatus, example: EquipmentCurrentStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(EquipmentCurrentStatus)
  current_status?: EquipmentCurrentStatus;
}
