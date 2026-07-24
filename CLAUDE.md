# CLAUDE.md — Media Department App (Monorepo Root)

This repository is a monorepo with two independent apps:

- `frontend/` — Next.js (App Router) + TypeScript + Redux Toolkit
- `backend/` — NestJS + TypeScript + MongoDB (Mongoose)

This is a **sibling project** to `protocol-department-app` (same church, same tech
stack, same author) but a fully separate codebase, database, and deployment. Do not
share code, auth, or data between the two unless explicitly asked to build a cross-app
integration.

**Before writing any code, read `docs/MEDIA_APP_BRIEF.md` in full.** It is the single
source of truth for what this application does — the entities, the two nested status
workflows (Service + Broadcast), the feature list, and the build order. `backend/CLAUDE.md`
and `frontend/CLAUDE.md` both assume you've already read it and go deeper on
stack-specific conventions.

Read them in this order:
1. `docs/MEDIA_APP_BRIEF.md` (what to build)
2. `backend/CLAUDE.md` (how to build the API)
3. `frontend/CLAUDE.md` (how to build the UI)

---

## What this app is, in one paragraph

The Media Department produces and distributes every service, Revival, and Crusade: live
camera/graphics production, live streaming to multiple platforms (YouTube, Facebook,
the in-house TV feed) simultaneously, photography, and post-production (clips, social
posts, VOD archive). This app tracks the coordination layer around that work — crew
assignments, equipment, run-of-show, live per-platform broadcast status, and the media
library — so the department always knows what's live right now, who's running it, and
what's left to publish. It does **not** do the actual video encoding/streaming — see the
brief's Section 1 "Explicit non-goal" before proposing any live-video-infrastructure
work.

---

## Non-negotiable ground rules

1. **The data model in `docs/MEDIA_APP_BRIEF.md` Section 2 is canonical.** Don't rename
   fields, don't drop fields, don't restructure entities without flagging it to the user
   first and explaining why.
2. **The status workflows in Section 3 are state machines, not string fields.** There are
   two, nested: `Service` status and per-platform `Broadcast` status. Enforce valid
   transitions server-side for both.
3. **Every status change is logged, never overwritten.** `StatusLog` is an append-only
   collection, polymorphic across `Service` and `Broadcast`. The current status fields on
   those entities are denormalized convenience fields; the log is the source of truth.
4. **Follow the phased build order in Section 7.** Don't build distribution/reporting
   polish (Phase 8) before the core tracking pipeline (Phases 2–4) is working end-to-end.
   Confirm each phase works before moving to the next.
5. **This app coordinates production, it does not perform it.** No RTMP ingest server,
   no video transcoding pipeline, no camera-control integration unless the user
   explicitly asks for that as a distinct, scoped piece of work — see the brief's
   Section 1.
6. **Ask before expanding scope.** If something isn't in the brief, don't silently add
   it. Flag it, suggest it, wait for confirmation.

---

## Working style expected on this project

- **Confirm the plan before generating large amounts of code.** For each phase, restate
  what you're about to build (schemas, endpoints, or screens) in a short plan, then
  proceed once it looks right.
- **Small, verifiable steps over big-bang generation.** Build one module fully
  (schema → DTO → service → controller → basic test) before starting the next.
- **Keep frontend and backend in sync deliberately.** When a backend DTO field changes,
  update the corresponding frontend TypeScript type in the same batch of work.
- **Real validation, not happy-path only.** Required fields, date/time logic (a
  `RunOfShowItem`'s time falls within its `Service`'s window, a `Broadcast` can't go Live
  before it's Scheduled), and role permissions are enforced on the backend regardless of
  what the frontend does.
- **This is a real tool for real people who are not developers**, often operating it
  live during a service under time pressure. Optimize for clarity and speed — a crew
  member checking their assignment or updating a broadcast's status needs to do it in a
  couple of taps, not hunt through menus.
- **Environment variables, not hardcoded values.** MongoDB URI, JWT secret, Cloudinary
  credentials, API base URL, and any platform API keys (YouTube/Facebook, once Phase 8
  is reached) all come from `.env` files.

## Git workflow — mandatory, no exceptions

Same convention as the Protocol Department app. `main` is protected once the GitHub repo
exists: pull requests are required, direct pushes are rejected, force-pushes/deletions
are disabled.

### Branch naming

```
feature/PR-XXX-short-kebab-description
```

- `XXX` is a zero-padded, sequential 3-digit number tracked in `.github/PR_COUNTER` at
  the repo root (starts at `000` for this repo — it does **not** continue Protocol's
  counter, these are separate repos).
- Example: `feature/PR-001-foundation-schemas`, `feature/PR-002-service-status-pipeline`.

**Before creating a new branch:**
1. Read the current value in `.github/PR_COUNTER`.
2. Increment it by 1 — that's your `XXX` (zero-padded to 3 digits).
3. Create the branch off the latest `main` using that number.
4. As part of your first commit on the branch, update `.github/PR_COUNTER`.

### The cycle, per module/phase

1. Build the module fully and verify it locally — tests pass, and where practical, a
   live smoke test against a running server.
2. `git checkout main && git pull`.
3. Create a branch named per the convention above.
4. Commit the work with a clear, conventional message.
5. Push the branch: `git push -u origin <branch-name>`.
6. Open a pull request into `main` (`gh pr create --base main --title ... --body ...`).
7. **Stop and ask the user to review and merge the PR on GitHub.** Do not merge it
   yourself, and do not start the next module until the user confirms it's merged.
8. Once confirmed, `git checkout main && git pull` before starting the next branch.

Never batch multiple unrelated modules into a single PR.

## Definition of "done" for this project

The Media Department should be able to:
- Log in with their own account and see only what their role permits
- Create a service, build its run-of-show, and see it on the schedule
- Assign specific members to camera, audio, streaming, graphics, and photography roles
- Track a service live across every platform it's streaming to, in one place
- Check equipment out and back in against a specific crew member
- Upload and find photos/clips/recordings for any past service in seconds
- Look back at any past service and see the full timeline of who did what, when

That's the bar. Build toward it phase by phase.
