import type { BroadcastStatus } from './enums';

export interface Broadcast {
  _id: string;
  service: string;
  platform: string;
  scheduled_start_time: string;
  status: BroadcastStatus;
  external_stream_url?: string;
  external_video_id?: string;
  peak_viewer_count?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
