import type { MediaAssetType } from './enums';

export interface MediaAsset {
  _id: string;
  service?: string;
  type: MediaAssetType;
  storage_url: string;
  tags: string[];
  uploaded_by: string;
  uploaded_at: string;
  updatedAt: string;
}
