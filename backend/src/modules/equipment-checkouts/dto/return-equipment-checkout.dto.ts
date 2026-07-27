import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReturnEquipmentCheckoutDto {
  @ApiPropertyOptional({ example: 'Returned with a cracked lens hood' })
  @IsOptional()
  @IsString()
  notes?: string;
}
