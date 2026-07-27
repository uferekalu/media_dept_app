import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Service } from '@/lib/types/service';
import type { StatusLog } from '@/lib/types/status-log';
import type { ServiceStatus, StatusLogEntityType } from '@/lib/types/enums';

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
  tagTypes: ['Service', 'StatusLog'],
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
  }),
});

export const {
  useGetLiveNowServicesQuery,
  useGetServiceQuery,
  useGetStatusLogQuery,
  useUpdateServiceStatusMutation,
} = api;
