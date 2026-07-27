import type { ServiceStatus, ServiceType } from './enums';

export interface Service {
  _id: string;
  name: string;
  type: ServiceType;
  date: string;
  start_time: string;
  end_time: string;
  speaker?: string;
  series?: string;
  venue: string;
  description?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}
