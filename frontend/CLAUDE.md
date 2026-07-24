# CLAUDE.md — Frontend (Next.js App Router + Redux Toolkit)

Read `../docs/MEDIA_APP_BRIEF.md` first if you haven't. This file covers *how* to build
the UI described there.

## Stack to scaffold in Phase 1

Nothing is scaffolded yet — mirrors the Protocol Department app's frontend exactly:

Next.js (App Router, Turbopack), React, TypeScript, Redux Toolkit + React-Redux,
Tailwind CSS v4, react-hook-form + zod for forms/validation, date-fns, lucide-react
icons, sonner for toasts, axios for API calls.

First Phase 1 PR should scaffold via `create-next-app`, then build `app/layout.tsx`,
`app/providers.tsx`, `lib/redux/store.ts`, `lib/redux/hooks.ts`, and `lib/api/client.ts`
before any feature screen.

## First thing to do after `npm install`

```bash
npx shadcn@latest init
npm install next-themes
```

Use shadcn/ui for buttons, cards, dialogs, forms, tables, badges, and the stepper
components both status pipelines (Service and Broadcast) need.

## Brand

Not yet decided for this app — ask the user before picking a primary color/brand
direction. Don't default to Protocol's purple just because it's a sibling project; the
Media Department may want its own identity. Once decided, follow the exact same
tokenization discipline as Protocol (below) — just with different values.

## Design tokens — mandatory, no exceptions

Same discipline as the Protocol app, word for word:

1. **Single source of truth: `app/globals.css`**, tokens defined under `@theme`
   (Tailwind v4) — colors, spacing, font family/sizes/weights/line-heights, radii,
   shadows, and dark-mode overrides. No raw values anywhere else.
2. Every component consumes tokens via Tailwind utility classes or `var(--token-name)` —
   never `style={{ color: '#...' }}` or `text-[15px]`.
3. Spacing/sizing uses a consistent scale.
4. Typography is a small fixed set of named text styles.
5. Component variants defined once via `class-variance-authority`.
6. Token names describe purpose (`--color-primary`, `--color-status-live`), not
   implementation detail.

## Theming — dark and light mode (mandatory)

Same mechanism as Protocol: `next-themes`'s `ThemeProvider` with `attribute="class"`,
default to system preference with an explicit toggle, no flash of wrong theme on load,
verify every screen in both modes — especially the two status steppers (Service and
Broadcast), the Live Now dashboard's status badges, and the media asset grid/lightbox.

## Folder structure convention

```
app/
  services/
  broadcasts/            — likely nested under services/[id] rather than top-level
  crew-assignments/
  equipment/
  media-assets/
  social-posts/
components/              — shadcn output lands in components/ui
lib/
  redux/
    store.ts
    hooks.ts
    slices/              — one per domain concept
  api/
    client.ts
    <domain>.ts
  types/                 — mirrors backend DTOs
```

## State management approach

Same as Protocol: Redux Toolkit for client/UI state, RTK Query for server state once
auth exists. Keep slices scoped to one domain concept each.

## Screens to build (maps to brief Section 5 and the phased plan in Section 7)

Build in this order, matching the backend's phase order:

1. **Dashboard (`/`)** — "Live Now" overview: services currently Live, per-platform
   broadcast status badges, crew on duty.
2. **Service list (`/services`)** and **service detail (`/services/[id]`)** — includes
   run-of-show, crew assignments, and per-platform broadcast status in one place.
3. **Create/edit service (`/services/new`, `/services/[id]/edit`)** with a run-of-show
   builder (ordered list, add/reorder/remove segments).
4. **Status timeline (`/services/[id]/timeline`)** — merged Service + Broadcast log,
   most recent first.
5. **Crew assignment board (`/crew`)** and **my assignments (`/my-assignments`)**.
6. **Equipment (`/equipment`)** — inventory + checkout log.
7. **Media asset library (`/media`)** — upload (Cloudinary), tag, search/filter.
8. **VOD archive (`/archive`)** — past services with recordings.
9. **Social post scheduler (`/social`)**.
10. **Login (`/login`)** / **Sign up (`/signup`)** — Phase 7, same self-service pattern
    as Protocol.
11. **Team directory (`/team`)** / **My profile (`/profile`)**.
12. **Reports (`/reports`)** — build last, Phase 8.

## Forms

Every form uses `react-hook-form` + a `zod` schema via `@hookform/resolvers/zod`. Mirror
backend validation (e.g. run-of-show timing within the service window) for instant
feedback, but never treat frontend validation as sufficient on its own.

## Design & UX bar

This is used live, during a service, often on a phone backstage or at a camera position:

- Big, unambiguous primary actions for status updates ("Mark Broadcast Live" as a
  prominent button, not a dropdown).
- Both status pipelines (Service and Broadcast) should be genuinely visual steppers, not
  just colored badges.
- Mobile-first for "My Assignments" and the status-update screens specifically; the
  dashboard, media library, and reports can be more desktop-oriented.
- Status colors are tokens (`--color-status-scheduled`, `--color-status-live`,
  `--color-status-ended`, `--color-status-published`, etc.) with light and dark values —
  never inline colors per screen. Pair color with icons/labels, don't rely on color
  alone.
- Loading and error states on every data-fetching screen.

## Setup (once Phase 1 scaffolding exists)

```bash
cd frontend
npm install
npx shadcn@latest init
npm install next-themes
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL
npm run dev
```

App at `http://localhost:3100` (a different port than Protocol's 3000, in case both run
locally at once), calling the API at `NEXT_PUBLIC_API_BASE_URL` (defaults to
`http://localhost:4100/api`).
