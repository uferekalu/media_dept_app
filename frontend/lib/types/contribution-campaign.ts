import type { ContributionCampaignPurposeCategory, ContributionCampaignStatus } from './enums';

export interface ContributionCampaign {
  _id: string;
  title: string;
  description?: string;
  purpose_category: ContributionCampaignPurposeCategory;
  equipment?: string;
  target_amount: number;
  currency: string;
  status: ContributionCampaignStatus;
  current_amount: number;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContributionCampaignInput {
  title: string;
  description?: string;
  purpose_category: ContributionCampaignPurposeCategory;
  equipment?: string;
  target_amount: number;
}

export type UpdateContributionCampaignInput = Partial<CreateContributionCampaignInput>;
