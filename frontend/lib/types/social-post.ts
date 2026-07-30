import type { SocialPostStatus } from './enums';

export interface SocialPost {
  _id: string;
  media_asset: string;
  platform: string;
  caption: string;
  scheduled_time: string;
  published_time?: string;
  status: SocialPostStatus;
  posted_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialPostInput {
  media_asset: string;
  platform: string;
  caption: string;
  scheduled_time: string;
  posted_by: string;
}

// posted_by isn't reassignable — mirrors backend/src/modules/social-posts/dto/update-social-post.dto.ts.
export type UpdateSocialPostInput = Partial<Omit<CreateSocialPostInput, 'posted_by'>>;
