import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { CrewAssignmentRole } from '../../../common/enums';

export class CreateCrewAssignmentDto {
  @ApiProperty({ description: 'Service id', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsMongoId()
  service: string;

  @ApiProperty({ description: 'Media team member id', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  media_team_member: string;

  @ApiProperty({ enum: CrewAssignmentRole, example: CrewAssignmentRole.CAMERA_1 })
  @IsEnum(CrewAssignmentRole)
  role: CrewAssignmentRole;

  @ApiProperty({ example: '2026-08-09T07:00:00.000Z', description: 'When this crew member needs to be present/ready — typically earlier than the service start_time' })
  @IsDateString()
  call_time: string;

  @ApiPropertyOptional({ example: 'Bring the backup battery' })
  @IsOptional()
  @IsString()
  notes?: string;
}
