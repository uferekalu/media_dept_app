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

// Mirrors backend/src/modules/services/dto/create-service.dto.ts — status is
// deliberately absent, it always starts at PLANNED and only moves through the
// dedicated guarded PATCH /services/:id/status endpoint, never this one.
export interface CreateServiceInput {
  name: string;
  type: ServiceType;
  date: string;
  start_time: string;
  end_time: string;
  speaker?: string;
  series?: string;
  venue: string;
  description?: string;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;
