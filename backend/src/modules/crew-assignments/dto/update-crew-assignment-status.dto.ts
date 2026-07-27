import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CrewAssignmentStatus } from '../../../common/enums';

export class UpdateCrewAssignmentStatusDto {
  @ApiProperty({ enum: CrewAssignmentStatus, example: CrewAssignmentStatus.CONFIRMED })
  @IsEnum(CrewAssignmentStatus)
  status: CrewAssignmentStatus;

  @ApiPropertyOptional({ example: 'Confirmed availability by phone' })
  @IsOptional()
  @IsString()
  notes?: string;
}
