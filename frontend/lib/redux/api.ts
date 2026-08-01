import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { Service } from '@/lib/types/service';
import type { StatusLog } from '@/lib/types/status-log';
import type { MediaTeamMember, UpdateMediaTeamMemberInput } from '@/lib/types/media-team-member';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type { Platform } from '@/lib/types/platform';
import type { Broadcast } from '@/lib/types/broadcast';
import type { Equipment } from '@/lib/types/equipment';
import type { EquipmentCheckout } from '@/lib/types/equipment-checkout';
import type { MediaAsset } from '@/lib/types/media-asset';
import type { SocialPost, CreateSocialPostInput, UpdateSocialPostInput } from '@/lib/types/social-post';
import type {
  ContributionCampaign,
  CreateContributionCampaignInput,
  UpdateContributionCampaignInput,
} from '@/lib/types/contribution-campaign';
import type { Contribution, InitiateContributionInput } from '@/lib/types/contribution';
import type {
  CrewActivityReportItem,
  EquipmentUtilizationReportItem,
  ServicesPerMonthReportItem,
} from '@/lib/types/report';
import type {
  BroadcastStatus,
  ContributionCampaignStatus,
  ContributionProvider,
  ContributionStatus,
  CrewAssignmentRole,
  CrewAssignmentStatus,
  EquipmentCategory,
  EquipmentCondition,
  EquipmentCurrentStatus,
  MediaAssetType,
  ServiceStatus,
  SocialPostStatus,
  StatusLogEntityType,
} from '@/lib/types/enums';
import type {
  AuthenticatedMediaTeamMember,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginResponse,
  ResetPasswordInput,
  SignupInput,
} from '@/lib/types/auth';
import type { RootState } from './store';
import { clearToken } from './slices/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4100/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Any 401 (expired token, or a guarded route rejecting an unauthenticated/wrong-role
// request) clears the session, so a stale/invalid token can't linger and every
// consumer of useCurrentUser() reacts the same way an explicit logout would produce.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(clearToken());
  }
  return result;
};

// Single RTK Query API slice for all server state, per frontend/CLAUDE.md — endpoints
// are added here as each screen needs them, grouped by backend resource.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  // A live dashboard should pick up changes another crew member just made — refetch
  // when the tab regains focus or the connection comes back, on top of the usual
  // tag-based invalidation. Paired with setupListeners(store.dispatch) in store.ts.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Service',
    'StatusLog',
    'MediaTeamMember',
    'CrewAssignment',
    'Platform',
    'Broadcast',
    'Equipment',
    'EquipmentCheckout',
    'MediaAsset',
    'SocialPost',
    'ContributionCampaign',
    'Contribution',
  ],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    getCurrentUser: builder.query<AuthenticatedMediaTeamMember, void>({
      query: () => '/auth/me',
      // A fixed 'ME' id (there's no per-invocation argument to key off) — lets
      // updateMediaTeamMember invalidate it whenever it might have just edited the
      // signed-in user's own record, so the header picks up a name/role change.
      providesTags: [{ type: 'MediaTeamMember', id: 'ME' }],
    }),

    signup: builder.mutation<LoginResponse, SignupInput>({
      query: (body) => ({ url: '/auth/signup', method: 'POST', body }),
    }),

    changePassword: builder.mutation<void, ChangePasswordInput>({
      query: (body) => ({ url: '/auth/change-password', method: 'PATCH', body }),
    }),

    forgotPassword: builder.mutation<void, ForgotPasswordInput>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<void, ResetPasswordInput>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    // Powers the Dashboard's "Live Now" view.
    getLiveNowServices: builder.query<Service[], void>({
      query: () => '/services/live-now',
      providesTags: (result) =>
        result
          ? [
              ...result.map((service) => ({ type: 'Service' as const, id: service._id })),
              { type: 'Service' as const, id: 'LIVE_NOW' },
            ]
          : [{ type: 'Service' as const, id: 'LIVE_NOW' }],
    }),

    // All services, unfiltered by status — used where a screen needs to resolve a
    // service's display name/date rather than just the active subset (e.g. My
    // Assignments, which can include a service that has since moved past PLANNED).
    getServices: builder.query<Service[], void>({
      query: () => '/services',
      providesTags: (result) =>
        result
          ? [
              ...result.map((service) => ({ type: 'Service' as const, id: service._id })),
              { type: 'Service' as const, id: 'LIST' },
            ]
          : [{ type: 'Service' as const, id: 'LIST' }],
    }),

    getService: builder.query<Service, string>({
      query: (id) => `/services/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Service', id }],
    }),

    // Generic per-entity log — kept for any screen that only needs one entity's
    // history (e.g. a single Broadcast's own timeline, should that ever get its own
    // screen). The Status Timeline screen uses getServiceTimeline below instead, since
    // it needs the Service's log merged with every one of its Broadcasts'.
    getStatusLog: builder.query<StatusLog[], { entityType: StatusLogEntityType; entityId: string }>({
      query: ({ entityType, entityId }) => `/status-logs/${entityType}/${entityId}`,
      providesTags: (_result, _error, { entityId }) => [{ type: 'StatusLog', id: entityId }],
    }),

    // Powers the Status Timeline screen — the Service's own log plus every one of its
    // Broadcasts' logs, merged and sorted server-side (GET /services/:id/timeline).
    getServiceTimeline: builder.query<StatusLog[], string>({
      query: (serviceId) => `/services/${serviceId}/timeline`,
      providesTags: (_result, _error, serviceId) => [{ type: 'StatusLog', id: serviceId }],
    }),

    // Guarded PATCH — the backend rejects anything not in
    // VALID_SERVICE_STATUS_TRANSITIONS. No `updated_by` sent yet (Phase 7 auth adds
    // the authenticated identity); the DTO field is optional until then.
    updateServiceStatus: builder.mutation<Service, { id: string; status: ServiceStatus; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/services/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Service', id: 'LIVE_NOW' },
        { type: 'StatusLog', id },
      ],
    }),

    // Powers the team directory and the Crew Assignment Board's "assign someone"
    // pickers.
    getMediaTeamMembers: builder.query<MediaTeamMember[], void>({
      query: () => '/media-team-members',
      providesTags: (result) =>
        result
          ? [
              ...result.map((member) => ({ type: 'MediaTeamMember' as const, id: member._id })),
              { type: 'MediaTeamMember' as const, id: 'LIST' },
            ]
          : [{ type: 'MediaTeamMember' as const, id: 'LIST' }],
    }),

    getMediaTeamMember: builder.query<MediaTeamMember, string>({
      query: (id) => `/media-team-members/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'MediaTeamMember', id }],
    }),

    updateMediaTeamMember: builder.mutation<
      MediaTeamMember,
      { id: string } & UpdateMediaTeamMemberInput
    >({
      query: ({ id, ...body }) => ({ url: `/media-team-members/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MediaTeamMember', id },
        { type: 'MediaTeamMember', id: 'LIST' },
        { type: 'MediaTeamMember', id: 'ME' },
      ],
    }),

    // FormData body — fetchBaseQuery leaves it untouched and lets the browser set the
    // multipart boundary itself; setting Content-Type manually here would omit it.
    uploadMediaTeamMemberPhoto: builder.mutation<MediaTeamMember, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('photo', file);
        return { url: `/media-team-members/${id}/photo`, method: 'POST', body: formData };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MediaTeamMember', id },
        { type: 'MediaTeamMember', id: 'LIST' },
        { type: 'MediaTeamMember', id: 'ME' },
      ],
    }),

    removeMediaTeamMemberPhoto: builder.mutation<MediaTeamMember, string>({
      query: (id) => ({ url: `/media-team-members/${id}/photo`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'MediaTeamMember', id },
        { type: 'MediaTeamMember', id: 'LIST' },
        { type: 'MediaTeamMember', id: 'ME' },
      ],
    }),

    // Powers the Crew Assignment Board (brief Section 5).
    getCrewAssignmentsByService: builder.query<CrewAssignment[], string>({
      query: (serviceId) => `/services/${serviceId}/crew-assignments`,
      providesTags: (result, _error, serviceId) => [
        { type: 'CrewAssignment' as const, id: `service-${serviceId}` },
        ...(result ?? []).map((a) => ({ type: 'CrewAssignment' as const, id: a._id })),
      ],
    }),

    // Powers "My Assignments" — a media team member's personal task list.
    getCrewAssignmentsByMediaTeamMember: builder.query<CrewAssignment[], string>({
      query: (mediaTeamMemberId) => `/media-team-members/${mediaTeamMemberId}/assignments`,
      providesTags: (result, _error, mediaTeamMemberId) => [
        { type: 'CrewAssignment' as const, id: `member-${mediaTeamMemberId}` },
        ...(result ?? []).map((a) => ({ type: 'CrewAssignment' as const, id: a._id })),
      ],
    }),

    createCrewAssignment: builder.mutation<
      CrewAssignment,
      { service: string; media_team_member: string; role: CrewAssignmentRole; call_time: string; notes?: string }
    >({
      query: (body) => ({ url: '/crew-assignments', method: 'POST', body }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'CrewAssignment', id: `service-${result.service}` },
              { type: 'CrewAssignment', id: `member-${result.media_team_member}` },
            ]
          : [],
    }),

    // Guarded PENDING -> CONFIRMED -> COMPLETED transition, mirrors
    // updateServiceStatus — the backend rejects anything not in
    // VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS.
    updateCrewAssignmentStatus: builder.mutation<
      CrewAssignment,
      { id: string; status: CrewAssignmentStatus; notes?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/crew-assignments/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (result, _error, { id }) => [
        { type: 'CrewAssignment', id },
        ...(result
          ? [
              { type: 'CrewAssignment' as const, id: `service-${result.service}` },
              { type: 'CrewAssignment' as const, id: `member-${result.media_team_member}` },
            ]
          : []),
      ],
    }),

    // serviceId/mediaTeamMemberId travel alongside id purely so their scoped list
    // caches can be invalidated precisely — DELETE returns no body to derive them from.
    deleteCrewAssignment: builder.mutation<void, { id: string; serviceId: string; mediaTeamMemberId: string }>({
      query: ({ id }) => ({ url: `/crew-assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id, serviceId, mediaTeamMemberId }) => [
        { type: 'CrewAssignment', id },
        { type: 'CrewAssignment', id: `service-${serviceId}` },
        { type: 'CrewAssignment', id: `member-${mediaTeamMemberId}` },
      ],
    }),

    // The small, mostly-fixed platform list (brief Section 2) — powers the Broadcast
    // management screen and the Dashboard's per-platform status badges.
    getPlatforms: builder.query<Platform[], void>({
      query: () => '/platforms',
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: 'Platform' as const, id: p._id })),
              { type: 'Platform' as const, id: 'LIST' },
            ]
          : [{ type: 'Platform' as const, id: 'LIST' }],
    }),

    // Powers the Broadcast management screen and the Dashboard's per-platform
    // breakdown (brief Section 4B's "Live Now" dashboard).
    getBroadcastsByService: builder.query<Broadcast[], string>({
      query: (serviceId) => `/services/${serviceId}/broadcasts`,
      providesTags: (result, _error, serviceId) => [
        { type: 'Broadcast' as const, id: `service-${serviceId}` },
        ...(result ?? []).map((b) => ({ type: 'Broadcast' as const, id: b._id })),
      ],
    }),

    createBroadcast: builder.mutation<
      Broadcast,
      { service: string; platform: string; scheduled_start_time: string }
    >({
      query: (body) => ({ url: '/broadcasts', method: 'POST', body }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Broadcast', id: `service-${result.service}` }] : [],
    }),

    // Guarded SCHEDULED -> LIVE -> ENDED -> PUBLISHED transition — may also trigger the
    // backend's Service rollup, so this invalidates the Service's own status/live-now
    // tags and its merged timeline too, not just the Broadcast's own cache entry.
    updateBroadcastStatus: builder.mutation<Broadcast, { id: string; status: BroadcastStatus; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/broadcasts/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Broadcast', id },
              { type: 'Broadcast', id: `service-${result.service}` },
              { type: 'Service', id: result.service },
              { type: 'Service', id: 'LIVE_NOW' },
              { type: 'StatusLog', id: result.service },
            ]
          : [{ type: 'Broadcast', id }],
    }),

    deleteBroadcast: builder.mutation<void, { id: string; serviceId: string }>({
      query: ({ id }) => ({ url: `/broadcasts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id, serviceId }) => [
        { type: 'Broadcast', id },
        { type: 'Broadcast', id: `service-${serviceId}` },
      ],
    }),

    // Powers the Equipment Inventory screen.
    getEquipment: builder.query<Equipment[], void>({
      query: () => '/equipment',
      providesTags: (result) =>
        result
          ? [
              ...result.map((e) => ({ type: 'Equipment' as const, id: e._id })),
              { type: 'Equipment' as const, id: 'LIST' },
            ]
          : [{ type: 'Equipment' as const, id: 'LIST' }],
    }),

    createEquipment: builder.mutation<
      Equipment,
      { name: string; category: EquipmentCategory; serial_number?: string }
    >({
      query: (body) => ({ url: '/equipment', method: 'POST', body }),
      invalidatesTags: [{ type: 'Equipment', id: 'LIST' }],
    }),

    // Covers both a plain details edit and marking something IN_REPAIR/condition
    // change — Equipment has no separate guarded status endpoint (brief Section 3
    // doesn't define a state machine for it).
    updateEquipment: builder.mutation<
      Equipment,
      { id: string; condition?: EquipmentCondition; current_status?: EquipmentCurrentStatus }
    >({
      query: ({ id, ...body }) => ({ url: `/equipment/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Equipment', id },
        { type: 'Equipment', id: 'LIST' },
      ],
    }),

    deleteEquipment: builder.mutation<void, string>({
      query: (id) => ({ url: `/equipment/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Equipment', id: 'LIST' }],
    }),

    // Powers the Equipment Checkout Log screen.
    getEquipmentCheckouts: builder.query<EquipmentCheckout[], void>({
      query: () => '/equipment-checkouts',
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'EquipmentCheckout' as const, id: c._id })),
              { type: 'EquipmentCheckout' as const, id: 'LIST' },
            ]
          : [{ type: 'EquipmentCheckout' as const, id: 'LIST' }],
    }),

    // Powers a per-item checkout history on the Inventory screen.
    getEquipmentCheckoutsByEquipment: builder.query<EquipmentCheckout[], string>({
      query: (equipmentId) => `/equipment/${equipmentId}/checkouts`,
      providesTags: (result, _error, equipmentId) => [
        { type: 'EquipmentCheckout' as const, id: `equipment-${equipmentId}` },
        ...(result ?? []).map((c) => ({ type: 'EquipmentCheckout' as const, id: c._id })),
      ],
    }),

    // Checking out equipment also flips its current_status to CHECKED_OUT
    // server-side, so this invalidates the Equipment cache too, not just the checkout
    // log's.
    createEquipmentCheckout: builder.mutation<
      EquipmentCheckout,
      { equipment: string; service?: string; checked_out_to: string; expected_return_at: string; notes?: string }
    >({
      query: (body) => ({ url: '/equipment-checkouts', method: 'POST', body }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'EquipmentCheckout', id: 'LIST' },
              { type: 'EquipmentCheckout', id: `equipment-${result.equipment}` },
              { type: 'Equipment', id: result.equipment },
              { type: 'Equipment', id: 'LIST' },
            ]
          : [{ type: 'EquipmentCheckout', id: 'LIST' }],
    }),

    // Reverts the equipment back to AVAILABLE server-side — same cross-invalidation
    // reasoning as createEquipmentCheckout above.
    returnEquipmentCheckout: builder.mutation<EquipmentCheckout, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/equipment-checkouts/${id}/return`, method: 'PATCH', body }),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'EquipmentCheckout', id },
              { type: 'EquipmentCheckout', id: 'LIST' },
              { type: 'EquipmentCheckout', id: `equipment-${result.equipment}` },
              { type: 'Equipment', id: result.equipment },
              { type: 'Equipment', id: 'LIST' },
            ]
          : [{ type: 'EquipmentCheckout', id }],
    }),

    deleteEquipmentCheckout: builder.mutation<void, { id: string; equipmentId: string }>({
      query: ({ id }) => ({ url: `/equipment-checkouts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id, equipmentId }) => [
        { type: 'EquipmentCheckout', id },
        { type: 'EquipmentCheckout', id: 'LIST' },
        { type: 'EquipmentCheckout', id: `equipment-${equipmentId}` },
      ],
    }),

    // Powers the Media Asset Library, with optional filters — omitted filter keys are
    // left out of the query string entirely rather than sent empty.
    getMediaAssets: builder.query<MediaAsset[], { service?: string; type?: MediaAssetType; tag?: string } | void>({
      query: (filter) => {
        const params = new URLSearchParams();
        if (filter?.service) params.set('service', filter.service);
        if (filter?.type) params.set('type', filter.type);
        if (filter?.tag) params.set('tag', filter.tag);
        const qs = params.toString();
        return `/media-assets${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((a) => ({ type: 'MediaAsset' as const, id: a._id })),
              { type: 'MediaAsset' as const, id: 'LIST' },
            ]
          : [{ type: 'MediaAsset' as const, id: 'LIST' }],
    }),

    // Powers the VOD Archive.
    getFullRecordings: builder.query<MediaAsset[], void>({
      query: () => '/media-assets/full-recordings',
      providesTags: (result) =>
        result
          ? [
              ...result.map((a) => ({ type: 'MediaAsset' as const, id: a._id })),
              { type: 'MediaAsset' as const, id: 'FULL_RECORDINGS' },
            ]
          : [{ type: 'MediaAsset' as const, id: 'FULL_RECORDINGS' }],
    }),

    // PHOTO/GRAPHIC/THUMBNAIL only — a real Cloudinary upload. FormData body, no
    // Content-Type header set manually so the browser fills in the multipart boundary
    // itself (same pattern protocol_dept_app's uploadProtocolMemberPhoto uses).
    uploadMediaAsset: builder.mutation<
      MediaAsset,
      { file: File; type: MediaAssetType; service?: string; uploaded_by: string; tags?: string }
    >({
      query: ({ file, ...fields }) => {
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(fields).forEach(([key, value]) => {
          if (value !== undefined) formData.append(key, value);
        });
        return { url: '/media-assets/upload', method: 'POST', body: formData };
      },
      invalidatesTags: [{ type: 'MediaAsset', id: 'LIST' }],
    }),

    // VIDEO_CLIP/FULL_RECORDING only — a pasted URL, no file at all.
    createMediaAssetLink: builder.mutation<
      MediaAsset,
      { type: MediaAssetType; storage_url: string; service?: string; uploaded_by: string; tags?: string[] }
    >({
      query: (body) => ({ url: '/media-assets', method: 'POST', body }),
      invalidatesTags: [{ type: 'MediaAsset', id: 'LIST' }, { type: 'MediaAsset', id: 'FULL_RECORDINGS' }],
    }),

    updateMediaAsset: builder.mutation<MediaAsset, { id: string; service?: string; tags?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/media-assets/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MediaAsset', id },
        { type: 'MediaAsset', id: 'LIST' },
      ],
    }),

    deleteMediaAsset: builder.mutation<void, string>({
      query: (id) => ({ url: `/media-assets/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'MediaAsset', id },
        { type: 'MediaAsset', id: 'LIST' },
        { type: 'MediaAsset', id: 'FULL_RECORDINGS' },
      ],
    }),

    // Powers the Social Post Scheduler (brief Section 5, screen 12).
    getSocialPosts: builder.query<
      SocialPost[],
      { platform?: string; status?: SocialPostStatus } | void
    >({
      query: (filter) => {
        const params = new URLSearchParams();
        if (filter?.platform) params.set('platform', filter.platform);
        if (filter?.status) params.set('status', filter.status);
        const qs = params.toString();
        return `/social-posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: 'SocialPost' as const, id: p._id })),
              { type: 'SocialPost' as const, id: 'LIST' },
            ]
          : [{ type: 'SocialPost' as const, id: 'LIST' }],
    }),

    createSocialPost: builder.mutation<SocialPost, CreateSocialPostInput>({
      query: (body) => ({ url: '/social-posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'SocialPost', id: 'LIST' }],
    }),

    updateSocialPost: builder.mutation<SocialPost, { id: string } & UpdateSocialPostInput>({
      query: ({ id, ...body }) => ({ url: `/social-posts/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SocialPost', id },
        { type: 'SocialPost', id: 'LIST' },
      ],
    }),

    updateSocialPostStatus: builder.mutation<SocialPost, { id: string; status: SocialPostStatus }>({
      query: ({ id, status }) => ({ url: `/social-posts/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SocialPost', id },
        { type: 'SocialPost', id: 'LIST' },
      ],
    }),

    deleteSocialPost: builder.mutation<void, string>({
      query: (id) => ({ url: `/social-posts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SocialPost', id },
        { type: 'SocialPost', id: 'LIST' },
      ],
    }),

    // Powers the Reports/History screen (brief Section 5, screen 14).
    getServicesPerMonthReport: builder.query<ServicesPerMonthReportItem[], void>({
      query: () => '/reports/services-per-month',
    }),

    getCrewActivityReport: builder.query<CrewActivityReportItem[], void>({
      query: () => '/reports/crew-activity',
    }),

    getEquipmentUtilizationReport: builder.query<EquipmentUtilizationReportItem[], void>({
      query: () => '/reports/equipment-utilization',
    }),

    // Powers the Contribution Campaigns screen (brief Section 5, screen 15).
    getContributionCampaigns: builder.query<ContributionCampaign[], { status?: ContributionCampaignStatus } | void>({
      query: (filter) => {
        const params = new URLSearchParams();
        if (filter?.status) params.set('status', filter.status);
        const qs = params.toString();
        return `/contribution-campaigns${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'ContributionCampaign' as const, id: c._id })),
              { type: 'ContributionCampaign' as const, id: 'LIST' },
            ]
          : [{ type: 'ContributionCampaign' as const, id: 'LIST' }],
    }),

    getContributionCampaign: builder.query<ContributionCampaign, string>({
      query: (id) => `/contribution-campaigns/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ContributionCampaign', id }],
    }),

    createContributionCampaign: builder.mutation<ContributionCampaign, CreateContributionCampaignInput>({
      query: (body) => ({ url: '/contribution-campaigns', method: 'POST', body }),
      invalidatesTags: [{ type: 'ContributionCampaign', id: 'LIST' }],
    }),

    updateContributionCampaign: builder.mutation<
      ContributionCampaign,
      { id: string } & UpdateContributionCampaignInput
    >({
      query: ({ id, ...body }) => ({ url: `/contribution-campaigns/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ContributionCampaign', id },
        { type: 'ContributionCampaign', id: 'LIST' },
      ],
    }),

    // Guarded ACTIVE -> COMPLETED/CLOSED transition, mirrors updateSocialPostStatus.
    updateContributionCampaignStatus: builder.mutation<
      ContributionCampaign,
      { id: string; status: ContributionCampaignStatus }
    >({
      query: ({ id, status }) => ({ url: `/contribution-campaigns/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ContributionCampaign', id },
        { type: 'ContributionCampaign', id: 'LIST' },
      ],
    }),

    deleteContributionCampaign: builder.mutation<void, string>({
      query: (id) => ({ url: `/contribution-campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ContributionCampaign', id },
        { type: 'ContributionCampaign', id: 'LIST' },
      ],
    }),

    // Starts a contribution — returns a gateway-hosted checkout_url the caller redirects
    // to (window.location.href, a full page navigation, not a client-side route).
    initiateContribution: builder.mutation<Contribution, InitiateContributionInput>({
      query: (body) => ({ url: '/contributions/initiate', method: 'POST', body }),
    }),

    // Powers the return page's poll loop after the gateway redirects back.
    getContribution: builder.query<Contribution, string>({
      query: (id) => `/contributions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Contribution', id }],
    }),

    // Safety net for the return page in case the webhook hasn't landed yet — manually
    // re-checks this contribution against the gateway. Also invalidates the campaign's
    // own cache entry, since a newly-SUCCESSFUL contribution bumps its current_amount.
    verifyContribution: builder.mutation<Contribution, { id: string; campaignId: string }>({
      query: ({ id }) => ({ url: `/contributions/${id}/verify`, method: 'POST' }),
      invalidatesTags: (_result, _error, { id, campaignId }) => [
        { type: 'Contribution', id },
        { type: 'ContributionCampaign', id: campaignId },
      ],
    }),

    // Full Contributions Ledger (brief Section 4I) — Admin-only, enforced by the
    // backend's @Roles() guard; the ledger page itself also skips this query entirely
    // for a non-Admin rather than firing a request that's guaranteed a 403.
    getContributions: builder.query<
      Contribution[],
      { campaign?: string; status?: ContributionStatus; provider?: ContributionProvider } | void
    >({
      query: (filter) => {
        const params = new URLSearchParams();
        if (filter?.campaign) params.set('campaign', filter.campaign);
        if (filter?.status) params.set('status', filter.status);
        if (filter?.provider) params.set('provider', filter.provider);
        const qs = params.toString();
        return `/contributions${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'Contribution' as const, id: c._id })),
              { type: 'Contribution' as const, id: 'LEDGER' },
            ]
          : [{ type: 'Contribution' as const, id: 'LEDGER' }],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetCurrentUserQuery,
  useSignupMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetLiveNowServicesQuery,
  useGetServicesQuery,
  useGetServiceQuery,
  useGetStatusLogQuery,
  useGetServiceTimelineQuery,
  useUpdateServiceStatusMutation,
  useGetMediaTeamMembersQuery,
  useGetMediaTeamMemberQuery,
  useUpdateMediaTeamMemberMutation,
  useUploadMediaTeamMemberPhotoMutation,
  useRemoveMediaTeamMemberPhotoMutation,
  useGetCrewAssignmentsByServiceQuery,
  useGetCrewAssignmentsByMediaTeamMemberQuery,
  useCreateCrewAssignmentMutation,
  useUpdateCrewAssignmentStatusMutation,
  useDeleteCrewAssignmentMutation,
  useGetPlatformsQuery,
  useGetBroadcastsByServiceQuery,
  useCreateBroadcastMutation,
  useUpdateBroadcastStatusMutation,
  useDeleteBroadcastMutation,
  useGetEquipmentQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
  useGetEquipmentCheckoutsQuery,
  useGetEquipmentCheckoutsByEquipmentQuery,
  useCreateEquipmentCheckoutMutation,
  useReturnEquipmentCheckoutMutation,
  useDeleteEquipmentCheckoutMutation,
  useGetMediaAssetsQuery,
  useGetFullRecordingsQuery,
  useUploadMediaAssetMutation,
  useCreateMediaAssetLinkMutation,
  useUpdateMediaAssetMutation,
  useDeleteMediaAssetMutation,
  useGetSocialPostsQuery,
  useCreateSocialPostMutation,
  useUpdateSocialPostMutation,
  useUpdateSocialPostStatusMutation,
  useDeleteSocialPostMutation,
  useGetServicesPerMonthReportQuery,
  useGetCrewActivityReportQuery,
  useGetEquipmentUtilizationReportQuery,
  useGetContributionCampaignsQuery,
  useGetContributionCampaignQuery,
  useCreateContributionCampaignMutation,
  useUpdateContributionCampaignMutation,
  useUpdateContributionCampaignStatusMutation,
  useDeleteContributionCampaignMutation,
  useInitiateContributionMutation,
  useGetContributionQuery,
  useVerifyContributionMutation,
  useGetContributionsQuery,
} = api;
