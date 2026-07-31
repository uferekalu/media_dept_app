# Project Brief: Media Department Broadcast & Production App
### For: Presbyterian Church of Nigeria — Media Department

This is the full, authoritative product brief for this application. Every module, screen,
and API endpoint built in this repository must trace back to something in this document.
If a feature is requested that isn't covered here, treat this document as the source of
truth and ask before inventing new scope.

This app is a **sibling project** to the Protocol Department app (same organization,
same tech stack, separate repo, separate database, separate deploy). It does not share
users or data with Protocol — a Media Team Member and a Protocol Member are different
accounts even if the same person happens to hold both roles.

---

## 1. Purpose

The Media Department produces and distributes every service, Revival, and Crusade: live
camera production, live graphics, live streaming to multiple platforms simultaneously,
photography, and post-production (clips, captions, social posts, archive). This app
digitizes the coordination layer around that work — who's on duty, what equipment they
have, what's live where right now, and where every piece of produced media ends up.

**Core goal:** at any moment, anyone in the department should be able to open the app and
know: *What service is live right now, on which platforms, who's running it, and what
still needs to happen before it's fully published and archived?*

**Explicit non-goal (read this before proposing architecture):** this app is **not** a
video encoder, RTMP ingest server, or streaming media server. Actual camera switching,
audio mixing, and pushing a signal to YouTube/Facebook/the in-house TV feed continues to
happen on the team's existing hardware/software (OBS, vMix, ATEM, ProPresenter, whatever
they already use). This app coordinates schedules, crew, equipment, status, and produced
assets *around* that production — it integrates with platforms via their APIs for
scheduling/analytics, it doesn't replace the production tools themselves. If a future
request implies building live video infrastructure, flag it and confirm scope before
building — that's a fundamentally different (and much larger) project.

---

## 2. Core Entities (Data Model)

This is the canonical data model. Backend schemas and frontend types must match this
exactly, field for field, unless a deliberate change is discussed and documented.

### `MediaTeamMember` (the users of the app)
- `id`
- `full_name`
- `phone_number`
- `role` (Admin / Director / Member)
- `skills[]` (e.g. Camera Operation, Audio, Streaming/Encoding, ProPresenter/Graphics,
  Photography, Video Editing, Social Media — used when building crew assignments, not
  a permission mechanism)

### `Service` (the thing being produced and broadcast — a Sunday service, Revival,
Crusade, Midweek, or Special Program)
- `id`
- `name` (e.g. "2026 Easter Revival — Day 1")
- `type` (Sunday Service / Revival / Crusade / Midweek / Special Program)
- `date`
- `start_time`
- `end_time` (estimated; actual end is recorded via status log)
- `speaker` (optional — the minister/preacher, free text; may later reference the
  Protocol app's Minister, but that integration is out of scope until explicitly asked
  for)
- `series` (optional, e.g. "Faith Series Pt. 3" — used for VOD organization)
- `venue`
- `description` (optional)
- `status` (see Section 3 — this is the key tracking field)

### `RunOfShowItem` (ordered segments within a `Service`)
- `id`
- `service_id`
- `order` (integer, defines sequence)
- `segment_name` (e.g. Praise & Worship, Announcements, Offering, Sermon, Altar Call,
  Communion)
- `scheduled_start_time`
- `duration_minutes`
- `graphics_notes` (e.g. "lyrics for 3 songs," "scripture reference slide," "offering
  QR code slide")
- `notes`

### `Platform` (the distribution destinations — a small, mostly-fixed reference list,
seeded at setup, not created per-service)
- `id`
- `name` (YouTube / Facebook / In-House TV Feed — extendable later, e.g. Instagram)
- `external_channel_or_page_id` (optional — used later for API calls)
- `enabled` (bool — lets the department turn a platform on/off without deleting history)

### `Broadcast` (links a `Service` to a `Platform` — the live-distribution tracking
record; one `Service` has one `Broadcast` per `Platform` it streams to)
- `id`
- `service_id`
- `platform_id`
- `scheduled_start_time`
- `status` (see Section 3 — Scheduled / Live / Ended / Published)
- `external_stream_url` (optional, e.g. the YouTube watch URL once live)
- `external_video_id` (optional, the platform's own ID — needed later for pulling
  analytics)
- `peak_viewer_count` (optional, filled in later via platform API or manual entry)
- `notes`

### `CrewAssignment` (which `MediaTeamMember` handles which role for a `Service`)
- `id`
- `service_id`
- `media_team_member_id`
- `role` (Director/Switcher, Camera 1, Camera 2, Camera 3, Audio, Streaming Engineer,
  Graphics/ProPresenter Operator, Photographer)
- `call_time` (when they need to be present/ready — earlier than `start_time`)
- `status` (Pending / Confirmed / Completed)
- `notes`

### `Equipment`
- `id`
- `name` (e.g. "Canon C70 #2," "Shure SM58 Wireless Kit A")
- `category` (Camera / Microphone / Tripod / Laptop / Memory Card / Cable / Lighting /
  Other)
- `serial_number` (optional)
- `condition` (Good / Needs Repair / Out of Service)
- `current_status` (Available / Checked Out / In Repair)

### `EquipmentCheckout` (append-only-ish log of who has what, when)
- `id`
- `equipment_id`
- `service_id` (optional — a checkout may not always be tied to a specific service)
- `checked_out_to` (media_team_member_id)
- `checked_out_at`
- `expected_return_at`
- `returned_at` (null until returned)
- `notes`

### `MediaAsset` (photos, video clips, full recordings, graphics, thumbnails)
- `id`
- `service_id` (optional — some assets, like a generic graphic template, aren't tied to
  one service)
- `type` (Photo / Video Clip / Full Recording / Graphic / Thumbnail)
- `storage_url` (Cloudinary URL)
- `tags[]` (e.g. speaker name, scripture reference, series)
- `uploaded_by` (media_team_member_id)
- `uploaded_at`

### `SocialPost` (a scheduled/published post referencing a `MediaAsset`, per `Platform`)
- `id`
- `media_asset_id`
- `platform_id`
- `caption`
- `scheduled_time`
- `published_time` (null until published)
- `status` (Draft / Scheduled / Published)
- `posted_by` (media_team_member_id)

### `StatusLog` (timeline/audit trail — every status change is recorded, not overwritten;
polymorphic across the two things that carry a status)
- `id`
- `entity_type` (Service / Broadcast)
- `entity_id`
- `status`
- `timestamp`
- `updated_by` (media_team_member_id)
- `notes`

### `ContributionCampaign` (a fundraising goal — see Section 4I; added Phase 10, not
part of the original v1 scope)
- `id`
- `title` (e.g. "Camera Repair Fund")
- `description`
- `purpose_category` (Equipment Purchase / Equipment Repair / General / Other)
- `equipment_id` (optional — ties a campaign to a specific `Equipment` record being
  bought or repaired)
- `target_amount` (integer, kobo — NGN's smallest unit, matching how every payment
  gateway itself represents amounts)
- `currency` (fixed `NGN` for v1)
- `status` (Active / Completed / Closed — Completed is informational once
  `current_amount` reaches `target_amount`; only Closed actually stops new
  contributions)
- `current_amount` (integer, kobo — denormalized cache, same "log is truth, field is
  convenience" convention as `Service.status`; recomputed from the sum of that
  campaign's `SUCCESSFUL` `Contribution`s)
- `created_by` (media_team_member_id)

### `Contribution` (a single payment against a `ContributionCampaign` — the money
ledger; append-only in spirit, like `StatusLog` — a row's `status` transitions but the
row itself is never deleted)
- `id`
- `campaign_id`
- `contributor` (media_team_member_id — **always derived from the authenticated
  request, never accepted from the request body**; this is the exact identity field
  every other "who did this" field in this app should also follow)
- `amount` (integer, kobo)
- `currency` (`NGN`)
- `provider` (Paystack / Flutterwave / Stripe)
- `internal_reference` (string, unique — generated by the backend before redirecting to
  the gateway's checkout; this, not the gateway's own reference, is what our system
  looks transactions up by)
- `provider_reference` (string, optional — the gateway's own transaction id/reference,
  once known)
- `status` (Pending → Successful | Failed; Successful → Refunded — a real state
  machine, same philosophy as every other status field in this app; `Refunded` is only
  ever set from a verified webhook, never a user action in v1)
- `checkout_url` (optional — the gateway-hosted payment page returned at initiation)
- `paid_at` (optional — set when the payment is confirmed Successful)
- `raw_provider_payload` (the last verify/webhook response body, kept for audit)
- `notes` (optional, free text from the contributor)

### `WebhookEvent` (dedup ledger — not a domain entity, purely a technical safeguard so
a payment gateway's retried webhook delivery can never double-apply a status change)
- `id`
- `provider` (Paystack / Flutterwave / Stripe)
- `event_id` (the gateway's own event id, or a hash of its signature if the gateway
  doesn't provide one — unique per `provider`)
- `processed_at`
- `payload` (raw body, for audit)

---

## 3. The Status Workflow (Most Important Part)

There are **two** state machines here, nested — a `Service`-level pipeline (the overall
production lifecycle) and a `Broadcast`-level sub-pipeline (per-platform live status,
one per `Platform` the service streams to). Both must be modeled as explicit **state
machines**, not free-text fields.

### `Service` status pipeline

1. **Planned** — service scheduled, run-of-show may still be in draft
2. **Crew Assigned** — every required `CrewAssignment` role has been filled
3. **Equipment Ready** — required equipment has been checked out to the crew
4. **Live** — the service is currently in progress (at least one `Broadcast` is Live)
5. **Ended** — the service has concluded
6. **Recording Processing** — full recording uploaded, being reviewed/clipped/edited
7. **Published** — VOD archived and available, key social posts published
8. **Archived** — fully closed out, appears only in historical reports going forward

### `Broadcast` status sub-pipeline (repeats per `Platform`, similar to how Protocol's
`preaching_dates[]` repeats per day — do not collapse this into a single value on
`Service`)

1. **Scheduled** — platform-side scheduling done (e.g. YouTube scheduled broadcast
   created), not yet live
2. **Live** — actively streaming on this platform
3. **Ended** — stream ended on this platform
4. **Published** — the VOD is live/available on this platform (e.g. YouTube auto-publishes
   the recording, Facebook video is public)

A `Service` cannot move to **Live** until at least one `Broadcast` is **Live**, and cannot
move to **Ended** until every non-disabled `Broadcast` tied to it is **Ended**. This
rollup logic belongs in the backend service layer, not the frontend.

Each status change (on either entity) must:
- Be timestamped automatically
- Record which `MediaTeamMember` updated it
- Be visible in a per-service timeline (the `StatusLog`, filtered by `entity_id`)
- Trigger the next logical prompt in the UI (e.g. once every `Broadcast` hits Ended, the
  UI should surface "upload the full recording" as the next action)

---

## 4. Feature List

### A. Service & Run-of-Show Management
- Create/edit a `Service` (Sunday Service, Revival, Crusade, Midweek, Special Program)
- Build a `RunOfShowItem` list per service — ordered segments with timing and graphics
  notes, visible to the crew on the day
- Duplicate a previous service's run-of-show as a starting template (e.g. a standard
  Sunday order of service)

### B. Live Broadcast Tracking (multi-platform)
- Seed and manage the small `Platform` list (YouTube, Facebook, In-House TV Feed)
- Per-service, create a `Broadcast` per platform it will stream to
- "Live Now" dashboard — every currently-Live service and its per-platform broadcast
  status, at a glance
- Manual status update per `Broadcast` (Scheduled → Live → Ended → Published)
- Full timeline/history log per service (the `StatusLog`)

### C. Crew & Equipment Management
- Media team member directory
- Assign specific members to specific roles for a service (`CrewAssignment`)
- Each member can see "my assignments" — a personal task list with call times
- Mark an assignment Confirmed/Completed
- Equipment inventory with condition/status
- Checkout/return log per piece of equipment, optionally tied to a service

### D. Media Asset Library & VOD Archive
- Upload photos/clips/recordings/graphics, tagged to a service (Cloudinary-backed
  storage)
- Searchable/filterable library (by service, date, speaker, series, type, tag)
- VOD archive view — past services with their full recording link and metadata

### E. Social Distribution & Scheduling
- Draft a `SocialPost` referencing a `MediaAsset` and a target `Platform`
- Schedule a post for a future time; mark Published once posted (manual in v1 — direct
  platform posting APIs are a later integration, not v1 scope)

### F. Notifications & Reminders (v2, but design the data model to support it from day
one)
- Reminder to an assigned crew member X minutes before their `call_time`
- Alert to Admin/Director if a `Broadcast` hasn't moved past Scheduled by its
  `scheduled_start_time`

### G. Reporting & Analytics
- Past services archive with full logs
- Simple reports: services produced per month, most active crew members, equipment
  utilization, (later) view counts pulled from YouTube Data API / Facebook Graph API once
  `external_video_id` is populated

### H. User Roles & Access

Mirrors the Protocol app's self-service model (same organization, same convention):

- **Sign-up is self-service.** A prospective Media Team Member creates their own account
  (full name, phone number, password). Every self-registered account starts as
  **Member** — the role is never user-selectable at sign-up.
- **Admin** — full access: manages services, run-of-show, broadcasts, crew assignments,
  equipment, and the platform list. The only role that can promote a Member to Director
  or edit another member's account. Also the **only** role that can see the
  Contributions ledger (Section 4I) — stricter than every other Admin/Director split in
  this app, since it's the one screen showing who gave how much.
- **Director** — same operational scope as Admin (services, run-of-show, broadcasts,
  crew assignments, equipment, media assets, social posts, contribution campaigns)
  except cannot change anyone's role, edit another member's account, or view the
  Contributions ledger.
- **Member** — read-only on the team directory, edits their own profile, sees and updates
  only their own `CrewAssignment`s and can upload `MediaAsset`s. Cannot create/edit
  Services, Broadcasts, or Equipment records. Can contribute to any Active campaign and
  see campaign progress totals, but not other members' individual contributions.

### I. Contributions & Fundraising (added Phase 10 — not part of the original v1 scope;
media team members funding equipment purchases/repairs previously happened entirely
off-platform)

- Admin/Director creates a `ContributionCampaign` — a fundraising goal with a title,
  purpose, optional linked `Equipment` record, and target amount.
- Any authenticated Media Team Member can see every Active campaign and its live
  progress (amount raised vs. target) on a campaigns screen.
- A Member contributes by choosing an amount and a payment method (Paystack,
  Flutterwave, or Stripe), which redirects to that gateway's own hosted checkout page —
  **this app never collects or stores card details itself.** Visa/Mastercard/Verve are
  not separate integrations; they're a channel each gateway already processes. Wallets
  like OPay/Moniepoint are funded by the contributor via bank transfer or a card either
  way, both of which Paystack/Flutterwave already support as channels — there is no
  direct OPay/Moniepoint merchant integration.
- **Stripe eligibility note:** Stripe does not offer direct merchant accounts to
  Nigeria-domiciled businesses as of this writing. Since this app is NGN-only and
  Paystack/Flutterwave already fully cover Naira cards and every local rail, Stripe
  should be treated as an optional, later addition — confirm a working Stripe account
  actually exists before building that integration.
- A `Contribution`'s status is only ever changed by a verified webhook from the
  gateway, never by the browser's return redirect alone (a closed tab or a directly-hit
  return URL must never be mistaken for a completed payment). Refunds/chargebacks are
  record-only in v1 — reflected via webhook, no in-app refund trigger.
- Admin sees the full Contributions ledger (every contribution, amount, contributor,
  gateway, status) plus a "funds raised" report alongside the existing Reports screen
  (Section 4G). Everyone else sees only campaign-level totals.

---

## 5. Suggested Screens

1. **Sign Up** / **Login**
2. **Dashboard** — "Live Now" overview: every in-progress service, per-platform broadcast
   status, crew on duty
3. **Service List / Service Detail** — includes run-of-show, crew assignments, and the
   per-platform broadcast status for that service
4. **Create/Edit Service** — with run-of-show builder
5. **Crew Assignment Board** — assign team members to roles per service
6. **My Assignments** — personal view for each team member
7. **Equipment Inventory** — list, condition, current checkout status
8. **Equipment Checkout Log**
9. **Status Timeline** — per-service history log (both Service and Broadcast events)
10. **Media Asset Library** — upload, tag, search
11. **VOD Archive** — past services, recordings, metadata
12. **Social Post Scheduler**
13. **Team Directory** / **My Profile**
14. **Reports/History Archive**
15. **Contribution Campaigns** — list of Active campaigns with progress, campaign
    detail + Contribute flow (Phase 10)
16. **Contributions Ledger** (Admin-only, Phase 10)

---

## 6. Tech Stack (locked in — same conventions as the Protocol Department app)

- **Frontend:** Next.js (App Router) + TypeScript + Redux Toolkit + Tailwind CSS +
  shadcn/ui (Radix primitives) + react-hook-form + zod for validation
- **Backend:** NestJS + TypeScript + MongoDB via Mongoose
- **Media storage:** Cloudinary (photos, video clips, graphics)
- **Platform integrations (Phase 8, not earlier):** YouTube Data API v3, Facebook Graph
  API — for pulling analytics and (later) scheduling broadcasts; the in-house TV feed has
  no API and is tracked manually
- **Payment gateways (Phase 10, not earlier):** Paystack + Flutterwave via direct REST
  calls (no third-party SDK — keeps webhook signature verification auditable in our own
  code), Stripe via its official `stripe` npm package. All three are hosted-checkout
  only; this app never touches raw card data.
- **Auth:** JWT-based, self-service sign-up (every new account starts as Member),
  role-based guards (Admin / Director / Member), admin-only role promotion
- **API style:** REST, documented with Swagger (`@nestjs/swagger`)

---

## 7. Phased Build Order

1. **Phase 1 — Foundation:** Mongoose schemas + REST CRUD for `MediaTeamMember`,
   `Service`, `RunOfShowItem`, `Platform` (seeded), `StatusLog`.
2. **Phase 2 — Core Tracking:** `Service` status state machine + Status Timeline UI +
   "Live Now" dashboard (Service-level only; Broadcast comes in Phase 4).
3. **Phase 3 — Crew:** `CrewAssignment` CRUD + assignment board + "My Assignments" view.
4. **Phase 4 — Multi-Platform Broadcasts:** `Broadcast` entity + per-platform sub-status
   state machine + rollup logic into `Service.status` + dashboard integration.
5. **Phase 5 — Equipment:** `Equipment` + `EquipmentCheckout` CRUD and views.
6. **Phase 6 — Media Asset Library:** `MediaAsset` CRUD, Cloudinary upload integration,
   VOD archive view.
7. **Phase 7 — Auth & Roles:** Self-service sign-up, login, role-based permissions and
   guards, admin-only role promotion. Staged across several PRs (backend infra first,
   then frontend session, then guards + sign-up) — same staging Protocol used, since it's
   proven to avoid leaving the app broken mid-phase.
8. **Phase 8 — Distribution & Reporting Polish:** `SocialPost` scheduler, YouTube/
   Facebook analytics pull, notifications/reminders, reports, historical archive.
9. **Phase 9 — Stretch (only after everything above is solid and only if requested):**
   AI-assisted sermon captioning, highlight-clip suggestions, auto-tagging.
10. **Phase 10 — Contributions & Fundraising** (Section 4I): `ContributionCampaign` CRUD
    first (no gateway), then the payment-provider abstraction + `Contribution` entity +
    Paystack integration end-to-end (initiate, verify, webhook) as the first real money
    flow, then Flutterwave additively, then Stripe (gated on confirmed account
    eligibility), then the frontend campaign/contribute flow and the Admin-only ledger.
    Each of these is its own PR per the standard cycle — never bundle gateway
    integrations together.

Build and verify each phase before moving to the next. Don't jump ahead to polish while
the core tracking pipeline is still unverified.
