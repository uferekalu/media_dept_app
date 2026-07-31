import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { ContributionProvider } from '../../../common/enums';

// contributor is never accepted here — it's always derived from the authenticated
// request (@CurrentUser()) in the controller.
export class InitiateContributionDto {
  @ApiProperty({ example: '6620a1f2c3d4e5f6a7b8c9d4', description: 'ContributionCampaign id' })
  @IsMongoId()
  campaign: string;

  @ApiProperty({ example: 5000000, description: 'Amount in kobo (₦50,000.00)' })
  @IsInt()
  @Min(100, { message: 'amount must be at least 100 kobo (₦1)' })
  amount: number;

  @ApiProperty({ enum: ContributionProvider, example: ContributionProvider.PAYSTACK })
  @IsEnum(ContributionProvider)
  provider: ContributionProvider;

  @ApiProperty({
    example: 'giver@example.com',
    description: "The contributor's email for this payment (used for the gateway's receipt) — not stored on their profile.",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'For the new tripod' })
  @IsOptional()
  @IsString()
  notes?: string;
}
