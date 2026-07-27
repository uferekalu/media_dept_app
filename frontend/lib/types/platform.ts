import type { PlatformName } from './enums';

export interface Platform {
  _id: string;
  name: PlatformName;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
