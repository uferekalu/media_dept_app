import type { StatusLogEntityType } from './enums';

export interface StatusLog {
  _id: string;
  entity_type: StatusLogEntityType;
  entity_id: string;
  status: string;
  timestamp: string;
  updated_by?: string;
  notes?: string;
}
