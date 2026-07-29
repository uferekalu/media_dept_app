import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

// Brief Section 4A: "Duplicate a previous service's run-of-show as a starting
// template (e.g. a standard Sunday order of service)." Copies every segment from
// source_service onto target_service, shifting each segment's scheduled_start_time by
// the same offset the target service's own start_time sits at relative to the
// source's — see RunOfShowService.duplicateFromService() for why a straight copy of
// the absolute timestamps would be wrong.
export class DuplicateRunOfShowDto {
  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d0', description: 'Service to copy segments from' })
  @IsMongoId()
  source_service: string;

  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d1', description: 'Service to copy segments into — must not already have any run-of-show items' })
  @IsMongoId()
  target_service: string;
}
