import type { ContributionProvider, ContributionStatus } from './enums';

export interface Contribution {
  _id: string;
  campaign: string;
  contributor: string;
  amount: number;
  currency: string;
  provider: ContributionProvider;
  internal_reference: string;
  provider_reference?: string;
  status: ContributionStatus;
  checkout_url?: string;
  paid_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateContributionInput {
  campaign: string;
  amount: number;
  provider: ContributionProvider;
  email: string;
  notes?: string;
}
