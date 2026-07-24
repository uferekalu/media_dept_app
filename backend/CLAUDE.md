# CLAUDE.md — Backend (NestJS + MongoDB)

Read `../docs/MEDIA_APP_BRIEF.md` first if you haven't. This file covers *how* to build
the API described there.

## Stack to scaffold in Phase 1

Nothing is scaffolded yet — this is the target, mirroring the Protocol Department app's
backend exactly since it's a proven setup for this team:

NestJS 11, Mongoose 8 (via `@nestjs/mongoose`), `class-validator` + `class-transformer`
for DTOs, `@nestjs/config` for env vars, `@nestjs/jwt` + `@nestjs/passport` for auth,
`@nestjs/swagger` for API docs, `helmet` + `bcrypt` for security basics, `cloudinary`
(official SDK) for media asset storage, added in Phase 6 when the Media Asset Library is
built (don't install it earlier than needed).

First Phase 1 PR should scaffold via `nest new backend`, then wire up `src/main.ts`
(global `ValidationPipe`, `/api` prefix, Swagger at `/api/docs`, helmet), `src/app.module.ts`,
`src/config/configuration.ts`, and `src/common/enums.ts` (the two status-transition maps
below) — same shape as Protocol's backend, before building any feature module.

## Module structure convention

Each entity from the brief gets its own module under `src/modules/<name>/`:

```
src/modules/services/
  services.module.ts
  services.controller.ts
  services.service.ts
  schemas/service.schema.ts
  dto/create-service.dto.ts
  dto/update-service.dto.ts
```

Follow this pattern for `services`, `run-of-show`, `platforms`, `broadcasts`,
`crew-assignments`, `equipment`, `equipment-checkouts`, `media-assets`, `social-posts`,
`status-logs`, `media-team-members`, and `auth`.

- **Schemas** use `@nestjs/mongoose` decorators. Use `Types.ObjectId` with `ref` for
  relationships (e.g. `Broadcast.service` refs `Service`, `Broadcast.platform` refs
  `Platform`).
- **DTOs** use `class-validator` decorators. Every `POST`/`PATCH` endpoint needs a DTO.
- **Controllers** stay thin — validate/transform via DTOs, delegate to the service.
- **Services** hold business logic, including both status-transition validations below.
- Register every new module in `app.module.ts`'s `imports` array.

## Status workflow — implementation requirement (two state machines)

`src/common/enums.ts` must encode **two** transition maps per the brief's Section 3:
`VALID_SERVICE_STATUS_TRANSITIONS` and `VALID_BROADCAST_STATUS_TRANSITIONS`. Don't
reinvent status logic inline in a service.

**Updating a `Broadcast`'s status** (`PATCH /broadcasts/:id/status`):
1. Look up current status, check against `VALID_BROADCAST_STATUS_TRANSITIONS`, reject
   with `400` on an invalid transition.
2. Update `Broadcast.status`.
3. Write a `StatusLog` with `entity_type: 'Broadcast'`.
4. **Rollup check:** if this update makes every non-disabled `Broadcast` for the parent
   `Service` reach `Ended`, and the `Service` is still `Live`, advance
   `Service.status` to `Ended` automatically (and log that as a second `StatusLog`
   entry, `entity_type: 'Service'`, `updated_by` the same user). Similarly, the first
   `Broadcast` to go `Live` should advance a `Planned`/`Crew Assigned`/`Equipment Ready`
   `Service` to `Live`.
5. Return the updated broadcast.

**Updating a `Service`'s status directly** (`PATCH /services/:id/status`) — for the
non-Broadcast-driven transitions (Planned → Crew Assigned → Equipment Ready, and Ended →
Recording Processing → Published → Archived):
1. Same validate-then-log pattern against `VALID_SERVICE_STATUS_TRANSITIONS`.
2. Reject attempts to manually set `Live`/`Ended` if they conflict with the current
   `Broadcast` rollup state (e.g. don't let someone mark a `Service` `Ended` while a
   `Broadcast` is still `Live`) — `400` with a clear message.

This rollup logic is the trickiest part of the whole backend — give it real unit test
coverage before moving on.

## Auth & roles

Same pattern as Protocol's backend, with three roles instead of Protocol's three
(`ADMIN` / `DIRECTOR` / `MEMBER` here, vs. `ADMIN` / `COORDINATOR` / `MEMBER` there):

- JWT-based auth. `MediaTeamMember` is both the "user" record and the domain entity.
- Passwords hashed with `bcrypt`, never stored/logged in plaintext. Reuse the same
  password-strength convention Protocol uses (shared regex/message constants) if this
  team wants parity — otherwise define `common/validators/password.constants.ts` fresh
  here since these are separate repos.
- `POST /auth/signup` is public, takes `full_name`/`phone_number`/`password`, always
  creates `role: MEMBER` — never trust a `role` field from the payload.
- **Bootstrapping the first ADMIN:** same trick as Protocol — `AuthService.signup()`
  checks `MediaTeamMembersService.count()`; if this is the first document, create it as
  `ADMIN` instead of `MEMBER`.
- `RolesGuard` + `@Roles(...)` decorator enforce permissions per the brief's Section 4H:
  - `ADMIN`/`DIRECTOR` — full read/write on `Service`, `RunOfShowItem`, `Broadcast`,
    `CrewAssignment`, `Equipment`, `EquipmentCheckout`, `Platform`. Only `ADMIN` may
    change a `MediaTeamMember`'s `role` or edit another member's account.
  - `MEMBER` — read-only on the team directory, edits own profile, scoped to own
    `CrewAssignment`s (`GET`/status update only where `media_team_member_id` matches
    `request.user.sub`), can create `MediaAsset`s.
  - Field/resource-level checks that `RolesGuard` alone can't express (self-vs-admin on
    profile edits, ownership on assignment updates) live directly in the controller,
    comparing `request.user.sub` to the resource's owning id, throwing
    `ForbiddenException` itself.
- Built last relative to the other modules (Phase 7), staged across several PRs: backend
  infra first (unguarded), then frontend session, then the PR that adds `/auth/signup`
  and applies guards to real endpoints.

## API conventions

- REST, prefixed with `/api`.
- Plural resource names: `/api/services`, `/api/run-of-show`, `/api/platforms`,
  `/api/broadcasts`, `/api/crew-assignments`, `/api/equipment`,
  `/api/equipment-checkouts`, `/api/media-assets`, `/api/social-posts`,
  `/api/media-team-members`.
- Purpose-built endpoints beyond plain CRUD:
  - `PATCH /services/:id/status`, `PATCH /broadcasts/:id/status` — the guarded
    status-transition endpoints above
  - `GET /services/live-now` — powers the live dashboard
  - `GET /media-team-members/:id/assignments` — powers "My Assignments"
  - `GET /services/:id/status-log` — merged timeline across `Service` and `Broadcast`
    events for that service, sorted by timestamp
- Every endpoint gets Swagger annotations. Docs at `/api/docs`.
- Validate: `RunOfShowItem.scheduled_start_time` falls within its `Service`'s
  `start_time`/`end_time` window; `EquipmentCheckout.returned_at` (if set) is after
  `checked_out_at`; a `Broadcast` can't be created for a disabled `Platform`.

## Testing expectations

- Unit tests for both status-transition validators and the rollup logic — this is the
  piece most likely to have a subtle bug that erodes trust in the whole system.
- Use `@nestjs/testing`'s `Test.createTestingModule` with a mocked Mongoose model for
  service-level tests; e2e tests (via `supertest`) for critical paths (create service →
  add broadcasts → move each to Live/Ended → verify Service auto-rolls-up → verify
  logs written).

## Setup (once Phase 1 scaffolding exists)

```bash
cd backend
npm install
cp .env.example .env   # MONGODB_URI, JWT_SECRET, and (Phase 6+) CLOUDINARY_* vars
npm run start:dev
```

API at `http://localhost:4100/api` (deliberately a different port than Protocol's 4000,
in case both apps run locally at once), Swagger docs at `http://localhost:4100/api/docs`.
