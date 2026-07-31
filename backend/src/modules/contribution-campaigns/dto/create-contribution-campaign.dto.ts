import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { ContributionCampaignPurposeCategory } from '../../../common/enums';

// created_by is never accepted here — it's always derived from the authenticated
// request (@CurrentUser()) in the controller, matching the identity-attribution rule
// documented in the brief's Section 4I.
export class CreateContributionCampaignDto {
  @ApiProperty({ example: 'Camera Repair Fund' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Repairing the gimbal mount on Camera 2 after the drop at the Easter Revival.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ContributionCampaignPurposeCategory,
    example: ContributionCampaignPurposeCategory.EQUIPMENT_REPAIR,
  })
  @IsEnum(ContributionCampaignPurposeCategory)
  purpose_category: ContributionCampaignPurposeCategory;

  @ApiPropertyOptional({ example: '6620a1f2c3d4e5f6a7b8c9d3', description: 'Equipment id this campaign is tied to' })
  @IsOptional()
  @IsMongoId()
  equipment?: string;

  @ApiProperty({ example: 15000000, description: 'Target amount in kobo (₦150,000.00)' })
  @IsInt()
  @Min(1)
  target_amount: number;
}
