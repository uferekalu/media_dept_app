// Shared enums for the Media Department app.
// These map directly to docs/MEDIA_APP_BRIEF.md Sections 2 and 3.
// Do not rename values without updating the brief and the frontend types together.

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

// The Service-level pipeline (brief Section 3). Enforcement of this map (the guarded
// PATCH /services/:id/status endpoint + StatusLog writes) is Phase 2 — this Phase 1 PR
// only defines the enum/status field on the schema, same as InvitationStatus existed in
// protocol_dept_app's Phase 1 before its transition guard was built in Phase 2.
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

export const VALID_SERVICE_STATUS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  [ServiceStatus.PLANNED]: [ServiceStatus.CREW_ASSIGNED],
  [ServiceStatus.CREW_ASSIGNED]: [ServiceStatus.EQUIPMENT_READY],
  [ServiceStatus.EQUIPMENT_READY]: [ServiceStatus.LIVE],
  // LIVE -> ENDED is normally driven by the Broadcast rollup once Phase 4 adds
  // Broadcast (see backend/CLAUDE.md's rollup rules), but the plain transition stays
  // valid here for the manual-override path.
  [ServiceStatus.LIVE]: [ServiceStatus.ENDED],
  [ServiceStatus.ENDED]: [ServiceStatus.RECORDING_PROCESSING],
  [ServiceStatus.RECORDING_PROCESSING]: [ServiceStatus.PUBLISHED],
  [ServiceStatus.PUBLISHED]: [ServiceStatus.ARCHIVED],
  [ServiceStatus.ARCHIVED]: [],
};

// The per-platform Broadcast sub-pipeline (brief Section 3). Repeats once per Platform
// a Service streams to — see backend/CLAUDE.md's rollup rules for how this feeds back
// into ServiceStatus.
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

export enum PlatformName {
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
  IN_HOUSE_TV_FEED = 'IN_HOUSE_TV_FEED',
}

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

// Polymorphic StatusLog target.
export enum StatusLogEntityType {
  SERVICE = 'SERVICE',
  BROADCAST = 'BROADCAST',
}
