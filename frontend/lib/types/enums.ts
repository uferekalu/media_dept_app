// Mirrors backend/src/common/enums.ts exactly — keep both in sync whenever either
// changes, per the root CLAUDE.md's "keep frontend and backend in sync deliberately"
// rule.

export enum MediaTeamMemberRole {
  ADMIN = 'ADMIN',
  DIRECTOR = 'DIRECTOR',
  MEMBER = 'MEMBER',
}

export enum ServiceType {
  SUNDAY_SERVICE = 'SUNDAY_SERVICE',
  REVIVAL = 'REVIVAL',
  CRUSADE = 'CRUSADE',
  MIDWEEK = 'MIDWEEK',
  SPECIAL_PROGRAM = 'SPECIAL_PROGRAM',
}

export enum ServiceStatus {
  PLANNED = 'PLANNED',
  CREW_ASSIGNED = 'CREW_ASSIGNED',
  EQUIPMENT_READY = 'EQUIPMENT_READY',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  RECORDING_PROCESSING = 'RECORDING_PROCESSING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// Ordered pipeline, for rendering the status stepper — array order is the source of
// truth for step sequence, matching VALID_SERVICE_STATUS_TRANSITIONS on the backend.
export const SERVICE_STATUS_ORDER: ServiceStatus[] = [
  ServiceStatus.PLANNED,
  ServiceStatus.CREW_ASSIGNED,
  ServiceStatus.EQUIPMENT_READY,
  ServiceStatus.LIVE,
  ServiceStatus.ENDED,
  ServiceStatus.RECORDING_PROCESSING,
  ServiceStatus.PUBLISHED,
  ServiceStatus.ARCHIVED,
];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  [ServiceStatus.PLANNED]: 'Planned',
  [ServiceStatus.CREW_ASSIGNED]: 'Crew Assigned',
  [ServiceStatus.EQUIPMENT_READY]: 'Equipment Ready',
  [ServiceStatus.LIVE]: 'Live',
  [ServiceStatus.ENDED]: 'Ended',
  [ServiceStatus.RECORDING_PROCESSING]: 'Recording Processing',
  [ServiceStatus.PUBLISHED]: 'Published',
  [ServiceStatus.ARCHIVED]: 'Archived',
};

// Mirrors backend/src/common/enums.ts's VALID_SERVICE_STATUS_TRANSITIONS — used to
// decide which "advance status" action(s), if any, a service's card should offer.
// Keep in sync with the backend map; the backend is still the source of truth/
// enforcement, this only drives which buttons the UI offers.
export const VALID_SERVICE_STATUS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  [ServiceStatus.PLANNED]: [ServiceStatus.CREW_ASSIGNED],
  [ServiceStatus.CREW_ASSIGNED]: [ServiceStatus.EQUIPMENT_READY],
  [ServiceStatus.EQUIPMENT_READY]: [ServiceStatus.LIVE],
  [ServiceStatus.LIVE]: [ServiceStatus.ENDED],
  [ServiceStatus.ENDED]: [ServiceStatus.RECORDING_PROCESSING],
  [ServiceStatus.RECORDING_PROCESSING]: [ServiceStatus.PUBLISHED],
  [ServiceStatus.PUBLISHED]: [ServiceStatus.ARCHIVED],
  [ServiceStatus.ARCHIVED]: [],
};

export const SERVICE_STATUS_ACTION_LABELS: Record<ServiceStatus, string> = {
  [ServiceStatus.PLANNED]: 'Mark Crew Assigned',
  [ServiceStatus.CREW_ASSIGNED]: 'Mark Equipment Ready',
  [ServiceStatus.EQUIPMENT_READY]: 'Go Live',
  [ServiceStatus.LIVE]: 'Mark Ended',
  [ServiceStatus.ENDED]: 'Start Processing',
  [ServiceStatus.RECORDING_PROCESSING]: 'Mark Published',
  [ServiceStatus.PUBLISHED]: 'Archive',
  [ServiceStatus.ARCHIVED]: 'Archived',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.SUNDAY_SERVICE]: 'Sunday Service',
  [ServiceType.REVIVAL]: 'Revival',
  [ServiceType.CRUSADE]: 'Crusade',
  [ServiceType.MIDWEEK]: 'Midweek',
  [ServiceType.SPECIAL_PROGRAM]: 'Special Program',
};

// Maps the 8 detailed statuses down to the small, deliberate status-color token set
// (frontend/CLAUDE.md's "Brand" section) — six semantic buckets, not eight distinct
// colors, same "reduce to a handful of meaningful buckets" approach protocol_dept_app
// uses for its own larger status set.
export type StatusColorBucket =
  | 'pending'
  | 'in-progress'
  | 'live'
  | 'wrap-up'
  | 'complete'
  | 'archived';

export const SERVICE_STATUS_COLOR: Record<ServiceStatus, StatusColorBucket> = {
  [ServiceStatus.PLANNED]: 'pending',
  [ServiceStatus.CREW_ASSIGNED]: 'in-progress',
  [ServiceStatus.EQUIPMENT_READY]: 'in-progress',
  [ServiceStatus.LIVE]: 'live',
  [ServiceStatus.ENDED]: 'wrap-up',
  [ServiceStatus.RECORDING_PROCESSING]: 'wrap-up',
  [ServiceStatus.PUBLISHED]: 'complete',
  [ServiceStatus.ARCHIVED]: 'archived',
};

export enum CrewAssignmentRole {
  DIRECTOR_SWITCHER = 'DIRECTOR_SWITCHER',
  CAMERA_1 = 'CAMERA_1',
  CAMERA_2 = 'CAMERA_2',
  CAMERA_3 = 'CAMERA_3',
  AUDIO = 'AUDIO',
  STREAMING_ENGINEER = 'STREAMING_ENGINEER',
  GRAPHICS_OPERATOR = 'GRAPHICS_OPERATOR',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
}

// Fixed order the Crew Assignment Board renders its role slots in.
export const CREW_ASSIGNMENT_ROLE_ORDER: CrewAssignmentRole[] = [
  CrewAssignmentRole.DIRECTOR_SWITCHER,
  CrewAssignmentRole.CAMERA_1,
  CrewAssignmentRole.CAMERA_2,
  CrewAssignmentRole.CAMERA_3,
  CrewAssignmentRole.AUDIO,
  CrewAssignmentRole.STREAMING_ENGINEER,
  CrewAssignmentRole.GRAPHICS_OPERATOR,
  CrewAssignmentRole.PHOTOGRAPHER,
];

export const CREW_ASSIGNMENT_ROLE_LABELS: Record<CrewAssignmentRole, string> = {
  [CrewAssignmentRole.DIRECTOR_SWITCHER]: 'Director / Switcher',
  [CrewAssignmentRole.CAMERA_1]: 'Camera 1',
  [CrewAssignmentRole.CAMERA_2]: 'Camera 2',
  [CrewAssignmentRole.CAMERA_3]: 'Camera 3',
  [CrewAssignmentRole.AUDIO]: 'Audio',
  [CrewAssignmentRole.STREAMING_ENGINEER]: 'Streaming Engineer',
  [CrewAssignmentRole.GRAPHICS_OPERATOR]: 'Graphics / ProPresenter',
  [CrewAssignmentRole.PHOTOGRAPHER]: 'Photographer',
};

export enum CrewAssignmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
}

export const VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS: Record<
  CrewAssignmentStatus,
  CrewAssignmentStatus[]
> = {
  [CrewAssignmentStatus.PENDING]: [CrewAssignmentStatus.CONFIRMED],
  [CrewAssignmentStatus.CONFIRMED]: [CrewAssignmentStatus.COMPLETED],
  [CrewAssignmentStatus.COMPLETED]: [],
};

export const CREW_ASSIGNMENT_STATUS_LABELS: Record<CrewAssignmentStatus, string> = {
  [CrewAssignmentStatus.PENDING]: 'Pending',
  [CrewAssignmentStatus.CONFIRMED]: 'Confirmed',
  [CrewAssignmentStatus.COMPLETED]: 'Completed',
};

export const CREW_ASSIGNMENT_STATUS_ACTION_LABELS: Record<CrewAssignmentStatus, string> = {
  [CrewAssignmentStatus.PENDING]: 'Confirm',
  [CrewAssignmentStatus.CONFIRMED]: 'Mark Completed',
  [CrewAssignmentStatus.COMPLETED]: 'Completed',
};

// Reuses the same six-bucket status-color token set as Service (frontend/CLAUDE.md's
// Brand section) rather than inventing a parallel one for a three-status entity.
export const CREW_ASSIGNMENT_STATUS_BADGE_VARIANT: Record<CrewAssignmentStatus, StatusColorBucket> = {
  [CrewAssignmentStatus.PENDING]: 'pending',
  [CrewAssignmentStatus.CONFIRMED]: 'in-progress',
  [CrewAssignmentStatus.COMPLETED]: 'complete',
};

export enum PlatformName {
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
  IN_HOUSE_TV_FEED = 'IN_HOUSE_TV_FEED',
}

export const PLATFORM_NAME_LABELS: Record<PlatformName, string> = {
  [PlatformName.YOUTUBE]: 'YouTube',
  [PlatformName.FACEBOOK]: 'Facebook',
  [PlatformName.IN_HOUSE_TV_FEED]: 'In-House TV Feed',
};

export enum BroadcastStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  PUBLISHED = 'PUBLISHED',
}

export const VALID_BROADCAST_STATUS_TRANSITIONS: Record<BroadcastStatus, BroadcastStatus[]> = {
  [BroadcastStatus.SCHEDULED]: [BroadcastStatus.LIVE],
  [BroadcastStatus.LIVE]: [BroadcastStatus.ENDED],
  [BroadcastStatus.ENDED]: [BroadcastStatus.PUBLISHED],
  [BroadcastStatus.PUBLISHED]: [],
};

export const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  [BroadcastStatus.SCHEDULED]: 'Scheduled',
  [BroadcastStatus.LIVE]: 'Live',
  [BroadcastStatus.ENDED]: 'Ended',
  [BroadcastStatus.PUBLISHED]: 'Published',
};

export const BROADCAST_STATUS_ACTION_LABELS: Record<BroadcastStatus, string> = {
  [BroadcastStatus.SCHEDULED]: 'Go Live',
  [BroadcastStatus.LIVE]: 'Mark Ended',
  [BroadcastStatus.ENDED]: 'Mark Published',
  [BroadcastStatus.PUBLISHED]: 'Published',
};

// Reuses the same six-bucket status-color token set as Service/CrewAssignment
// (frontend/CLAUDE.md's Brand section) rather than a fourth parallel palette.
export const BROADCAST_STATUS_BADGE_VARIANT: Record<BroadcastStatus, StatusColorBucket> = {
  [BroadcastStatus.SCHEDULED]: 'pending',
  [BroadcastStatus.LIVE]: 'live',
  [BroadcastStatus.ENDED]: 'wrap-up',
  [BroadcastStatus.PUBLISHED]: 'complete',
};

export enum StatusLogEntityType {
  SERVICE = 'SERVICE',
  BROADCAST = 'BROADCAST',
}

export enum EquipmentCategory {
  CAMERA = 'CAMERA',
  MICROPHONE = 'MICROPHONE',
  TRIPOD = 'TRIPOD',
  LAPTOP = 'LAPTOP',
  MEMORY_CARD = 'MEMORY_CARD',
  CABLE = 'CABLE',
  LIGHTING = 'LIGHTING',
  OTHER = 'OTHER',
}

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.CAMERA]: 'Camera',
  [EquipmentCategory.MICROPHONE]: 'Microphone',
  [EquipmentCategory.TRIPOD]: 'Tripod',
  [EquipmentCategory.LAPTOP]: 'Laptop',
  [EquipmentCategory.MEMORY_CARD]: 'Memory Card',
  [EquipmentCategory.CABLE]: 'Cable',
  [EquipmentCategory.LIGHTING]: 'Lighting',
  [EquipmentCategory.OTHER]: 'Other',
};

export enum EquipmentCondition {
  GOOD = 'GOOD',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  [EquipmentCondition.GOOD]: 'Good',
  [EquipmentCondition.NEEDS_REPAIR]: 'Needs Repair',
  [EquipmentCondition.OUT_OF_SERVICE]: 'Out of Service',
};

// Not a guarded pipeline (no VALID_..._TRANSITIONS map, unlike Service/Broadcast/
// CrewAssignment) — backend/CLAUDE.md doesn't define a state machine for Equipment.
// current_status is set directly via edit or as a checkout/return side effect.
export enum EquipmentCurrentStatus {
  AVAILABLE = 'AVAILABLE',
  CHECKED_OUT = 'CHECKED_OUT',
  IN_REPAIR = 'IN_REPAIR',
}

export const EQUIPMENT_CURRENT_STATUS_LABELS: Record<EquipmentCurrentStatus, string> = {
  [EquipmentCurrentStatus.AVAILABLE]: 'Available',
  [EquipmentCurrentStatus.CHECKED_OUT]: 'Checked Out',
  [EquipmentCurrentStatus.IN_REPAIR]: 'In Repair',
};

export const EQUIPMENT_CURRENT_STATUS_BADGE_VARIANT: Record<EquipmentCurrentStatus, StatusColorBucket> = {
  [EquipmentCurrentStatus.AVAILABLE]: 'complete',
  [EquipmentCurrentStatus.CHECKED_OUT]: 'in-progress',
  [EquipmentCurrentStatus.IN_REPAIR]: 'archived',
};

export const EQUIPMENT_CONDITION_BADGE_VARIANT: Record<EquipmentCondition, StatusColorBucket> = {
  [EquipmentCondition.GOOD]: 'complete',
  [EquipmentCondition.NEEDS_REPAIR]: 'pending',
  [EquipmentCondition.OUT_OF_SERVICE]: 'archived',
};
