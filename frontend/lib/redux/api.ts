import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Service } from '@/lib/types/service';
import type { StatusLog } from '@/lib/types/status-log';
import type { MediaTeamMember } from '@/lib/types/media-team-member';
import type { CrewAssignment } from '@/lib/types/crew-assignment';
import type {
  CrewAssignmentRole,
  CrewAssignmentStatus,
  ServiceStatus,
  StatusLogEntityType,
} from '@/lib/types/enums';

// Single RTK Query API slice for all server state, per frontend/CLAUDE.md — endpoints
// are added here as each screen needs them, grouped by backend resource. No auth token
// wiring yet (Phase 7) — add prepareHeaders once login exists, same as
// protocol_dept_app's api.ts does.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4100/api',
  }),
  // A live dashboard should pick up changes another crew member just made — refetch
  // when the tab regains focus or the connection comes back, on top of the usual
  // tag-based invalidation. Paired with setupListeners(store.dispatch) in store.ts.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ['Service', 'StatusLog', 'MediaTeamMember', 'CrewAssignment'],
  endpoints: (builder) => ({
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

    // Powers the Status Timeline screen — entityType is always 'SERVICE' until
    // Phase 4 adds Broadcast, but the arg shape stays generic to match the backend's
    // polymorphic GET /status-logs/:entityType/:entityId.
    getStatusLog: builder.query<StatusLog[], { entityType: StatusLogEntityType; entityId: string }>({
      query: ({ entityType, entityId }) => `/status-logs/${entityType}/${entityId}`,
      providesTags: (_result, _error, { entityId }) => [{ type: 'StatusLog', id: entityId }],
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

    // Powers the team directory, the ActingAsPicker, and the Crew Assignment Board's
    // "assign someone" pickers.
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
  }),
});

export const {
  useGetLiveNowServicesQuery,
  useGetServicesQuery,
  useGetServiceQuery,
  useGetStatusLogQuery,
  useUpdateServiceStatusMutation,
  useGetMediaTeamMembersQuery,
  useGetCrewAssignmentsByServiceQuery,
  useGetCrewAssignmentsByMediaTeamMemberQuery,
  useCreateCrewAssignmentMutation,
  useUpdateCrewAssignmentStatusMutation,
  useDeleteCrewAssignmentMutation,
} = api;
