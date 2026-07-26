import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ServiceStatus } from '../../../common/enums';

export class UpdateServiceStatusDto {
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.CREW_ASSIGNED })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  // Accepted directly in the body for now since Auth (Phase 7) doesn't exist yet to
  // supply an authenticated identity via @CurrentUser(). Once it does, this field is
  // dropped from the DTO and StatusLogsService.create() is called with the JWT's
  // subject instead — never trusted from the request body at that point (same rule
  // protocol_dept_app applies to Invitation.updated_by).
  @ApiPropertyOptional({ example: '6620a1f2c3d4e5f6a7b8c9d1' })
  @IsOptional()
  @IsMongoId()
  updated_by?: string;

  @ApiPropertyOptional({ example: 'Full crew confirmed for this service' })
  @IsOptional()
  @IsString()
  notes?: string;
}
