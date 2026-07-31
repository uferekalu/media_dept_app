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

// Mirrors frontend/lib/types/enums.ts's own copy — used server-side only for the
// crew-assignment SMS notification text (CrewAssignmentsService.notifyAssignment()).
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

export enum EquipmentCondition {
  GOOD = 'GOOD',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

// Not a guarded state machine like Service/Broadcast/CrewAssignment (brief Section 3
// doesn't define one for Equipment) — current_status is set directly via the general
// update endpoint (e.g. marking something IN_REPAIR) or as a side effect of the
// checkout/return flow (EquipmentCheckoutsService), whichever happens.
export enum EquipmentCurrentStatus {
  AVAILABLE = 'AVAILABLE',
  CHECKED_OUT = 'CHECKED_OUT',
  IN_REPAIR = 'IN_REPAIR',
}

// Polymorphic StatusLog target.
export enum StatusLogEntityType {
  SERVICE = 'SERVICE',
  BROADCAST = 'BROADCAST',
}

export enum MediaAssetType {
  PHOTO = 'PHOTO',
  VIDEO_CLIP = 'VIDEO_CLIP',
  FULL_RECORDING = 'FULL_RECORDING',
  GRAPHIC = 'GRAPHIC',
  THUMBNAIL = 'THUMBNAIL',
}

// Deliberate scope decision (confirmed with the user, not in the original brief text):
// video is large/long-running and the content usually already lives on YouTube via the
// Service's Broadcast anyway, so video-type assets never go through an actual
// Cloudinary upload — they just store a pasted URL. Only these two get a real file
// upload (POST /media-assets/upload); VIDEO_MEDIA_ASSET_TYPES go through the plain JSON
// POST /media-assets instead. See MediaAssetsService.
export const IMAGE_MEDIA_ASSET_TYPES = [
  MediaAssetType.PHOTO,
  MediaAssetType.GRAPHIC,
  MediaAssetType.THUMBNAIL,
];

export const VIDEO_MEDIA_ASSET_TYPES = [
  MediaAssetType.VIDEO_CLIP,
  MediaAssetType.FULL_RECORDING,
];

// Brief Section 3 doesn't define a SocialPost pipeline (StatusLog's entity_type is
// explicitly scoped to Service/Broadcast only), but Section 4E ("Schedule a post for a
// future time; mark Published once posted") still describes a small, real progression —
// modeled the same way as CrewAssignment/Equipment's own un-logged guarded transitions.
export enum SocialPostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
}

// DRAFT can go straight to PUBLISHED (posting immediately, no pre-scheduling) or via
// SCHEDULED first — both are explicitly "manual in v1" per the brief, so neither path
// is more correct than the other.
export const VALID_SOCIAL_POST_STATUS_TRANSITIONS: Record<SocialPostStatus, SocialPostStatus[]> = {
  [SocialPostStatus.DRAFT]: [SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED],
  [SocialPostStatus.SCHEDULED]: [SocialPostStatus.PUBLISHED],
  [SocialPostStatus.PUBLISHED]: [],
};

// Contributions & Fundraising (brief Section 4I, Phase 10).
export enum ContributionCampaignPurposeCategory {
  EQUIPMENT_PURCHASE = 'EQUIPMENT_PURCHASE',
  EQUIPMENT_REPAIR = 'EQUIPMENT_REPAIR',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

export enum ContributionCampaignStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

// ACTIVE can reach COMPLETED on its own (current_amount hits target_amount — informational,
// doesn't stop new contributions) or be CLOSED directly by an Admin/Director; COMPLETED can
// still be CLOSED afterward. CLOSED is terminal — a closed campaign never reopens.
export const VALID_CONTRIBUTION_CAMPAIGN_STATUS_TRANSITIONS: Record<
  ContributionCampaignStatus,
  ContributionCampaignStatus[]
> = {
  [ContributionCampaignStatus.ACTIVE]: [
    ContributionCampaignStatus.COMPLETED,
    ContributionCampaignStatus.CLOSED,
  ],
  [ContributionCampaignStatus.COMPLETED]: [ContributionCampaignStatus.CLOSED],
  [ContributionCampaignStatus.CLOSED]: [],
};

// Contribution.provider and Contribution.status arrive in PR-031 alongside the
// Contribution entity itself, once there's an actual payment-provider abstraction to
// pair them with.
