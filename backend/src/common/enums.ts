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

// The per-platform Broadcast sub-pipeline arrives with the Broadcast entity in Phase 4 —
// not defined yet, since there's no schema to attach it to until then.

export enum PlatformName {
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
  IN_HOUSE_TV_FEED = 'IN_HOUSE_TV_FEED',
}

// Polymorphic StatusLog target — BROADCAST isn't written to until Phase 4, but the enum
// is defined now so the StatusLog schema's entity_type field has its full shape from
// Phase 1 (same reasoning as Protocol's ProtocolMember password field arriving before
// Auth did).
export enum StatusLogEntityType {
  SERVICE = 'SERVICE',
  BROADCAST = 'BROADCAST',
}
