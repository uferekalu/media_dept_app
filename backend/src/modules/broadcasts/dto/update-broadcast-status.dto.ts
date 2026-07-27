import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BroadcastStatus } from '../../../common/enums';

export class UpdateBroadcastStatusDto {
  @ApiProperty({ enum: BroadcastStatus, example: BroadcastStatus.LIVE })
  @IsEnum(BroadcastStatus)
  status: BroadcastStatus;

  @ApiPropertyOptional({ example: 'Stream key rotated before going live' })
  @IsOptional()
  @IsString()
  notes?: string;
}
