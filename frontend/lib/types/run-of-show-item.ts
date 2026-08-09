export interface RunOfShowItem {
  _id: string;
  service: string;
  order: number;
  segment_name: string;
  scheduled_start_time: string;
  duration_minutes: number;
  graphics_notes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Mirrors backend/src/modules/run-of-show/dto/create-run-of-show-item.dto.ts.
export interface CreateRunOfShowItemInput {
  service: string;
  order: number;
  segment_name: string;
  scheduled_start_time: string;
  duration_minutes: number;
  graphics_notes?: string;
  notes?: string;
}

// service isn't reassignable after creation — mirrors UpdateRunOfShowItemDto.
export type UpdateRunOfShowItemInput = Partial<Omit<CreateRunOfShowItemInput, 'service'>>;
