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

**Brand colors: Rose Red and white.** Rose Red is the primary/accent color across the
entire UI (primary buttons, active nav states, links, the status steppers' "active"
step, focus rings, selected nav items) — the same *role* purple plays in protocol_dept_app,
just a different hue. White (and near-white/near-black neutrals derived from it) forms
the base surface in light mode, exactly like Protocol.

- Pick one Rose Red hue and derive a full 50–950 scale from it, the same way Protocol's
  `globals.css` derives its purple scale (see that file for the exact technique: a base
  hex at 600, a Tailwind-style ramp above/below it, neutrals given a slight hue bias
  toward the brand color in `oklch()` rather than a pure unrelated gray).
- **Exact hex value is not finalized yet** — per [[feedback_visual_design_no_browser]]
  (no live browser preview available in this environment), propose a specific candidate
  hex, show the derived scale, and get explicit confirmation before writing it into
  `globals.css`, rather than guessing blind on a brand-defining color. A reasonable
  starting candidate to confirm: a deep, slightly warm red-pink around `#C2185B`–`#B0193F`
  (true rose red — more red than a Barbie/magenta pink, more pink than a pure fire-engine
  red) — not final until confirmed.
- Status colors stay semantically independent of the brand hue (Protocol's pattern:
  pending/in-progress/complete get their own neutral/amber/green tokens, not brand-tinted
  ones) — this app has more statuses (`Service` has 8, `Broadcast` has 4), so plan a
  slightly larger but still small, deliberate status-color set, not one improvised per
  screen.

## Header, Navigation & Drawer — mirror protocol_dept_app's structure exactly

Same component shapes, same breakpoints, same interaction rules as protocol_dept_app's
frontend — only the brand color, wordmark/logo, and link list differ. This is a
deliberate reuse of a proven pattern, not a coincidence — replicate the *structure*,
re-theme it in Rose Red, and populate it with this app's own nav links.

- **`AppHeader`** — sticky top bar (`sticky top-0 z-40`, blurred translucent background),
  logo + wordmark on the left (wordmark shortens to an abbreviated form below `sm`, full
  name at `sm` and up — e.g. "Media Dept" / "Media Department", the same idea as
  Protocol's "Protocol Dept" / "Protocol Department"), `UserMenu` + `ThemeToggle` on the
  right.
- **`AppNav`** — desktop/tablet only (`sm` and up), a sticky horizontal scrollable tab
  row directly under the header, active link underlined and colored with the primary
  token, gated on a confirmed logged-in identity (renders nothing until
  `useCurrentUser()` resolves — don't gate on a raw token, it can be stale).
- **`MobileNavDrawer`** — below `sm` only, a collapsible icon-rail sidebar fixed to the
  left edge spanning the viewport height under the header. Collapsed width reserved in
  page content via a `pl-14`-equivalent gutter so content is never covered; expanded
  state overlays on top instead of resizing the reserved gutter. Persist the
  expanded/collapsed preference in `localStorage` under an app-specific key (e.g.
  `media-department:mobile-nav-expanded` — not Protocol's key). Must close on: (a) an
  outside pointer-down, and (b) tapping a nav link — both are required. Protocol
  originally shipped without (b) and had to ship a follow-up fix once it shipped
  (`fix: mobile nav drawer stays open after tapping a link`) — build it in from the
  start here instead of repeating that bug.
- **`ThemeToggle`** — `next-themes`' `useTheme()`, sun/moon `lucide-react` icon, a
  mount-guard (`useHasMounted`-equivalent) to avoid an SSR/client hydration mismatch on
  the icon, lives in the header, always visible.
- **Wiring order in `app/providers.tsx`**: `ThemeProvider` → Redux `Provider` →
  `AuthGuard` → `AppHeader` → `AppNav` → `MobileNavDrawer` → a content gutter wrapper →
  page content → `Toaster`. Same order Protocol uses; don't reorder without a reason.

## Mobile responsiveness — non-negotiable

This app is used live, in the field (backstage, at a camera position, holding a phone)
even more than Protocol is. Every screen must be verified at a narrow phone width, not
just checked at desktop width and assumed to reflow correctly:
- The nav pattern above (`AppNav` swaps for `MobileNavDrawer` below `sm`) is the backbone
  of this — don't add a third, different nav pattern for any individual screen.
- Forms, tables, and the media asset grid all need an explicit mobile layout (e.g. a
  table becomes stacked cards below `sm`), not just horizontal scroll as the only
  fallback.
- Touch targets (buttons, nav links, status-update actions) sized generously — this is
  the same "two taps, not a tiny icon in a dropdown" bar Protocol holds itself to.

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
default to system preference with an explicit toggle (the header `ThemeToggle` described
above), no flash of wrong theme on load, verify every screen in both modes — especially
the two status steppers (Service and Broadcast), the Live Now dashboard's status badges,
and the media asset grid/lightbox.

Rose Red must stay legible and on-brand in both themes — same rule Protocol applied to
its purple: use a lighter/brighter stop of the Rose Red scale (e.g. the 300 step) as
`--primary` in dark mode rather than reusing the exact 600-step light-mode hex. Deep reds
in particular can read as muddy/low-contrast on a dark background if this isn't done
deliberately — check contrast on real dark-mode renders, not just in theory.

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
