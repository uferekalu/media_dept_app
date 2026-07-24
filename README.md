# Media Department App

Presbyterian Church of Nigeria — Media Department broadcast & production coordination
app. Sibling project to `protocol-department-app`: same tech stack, separate repo,
separate database.

Tracks: service run-of-show, multi-platform live broadcast status (YouTube, Facebook,
in-house TV feed), crew assignments, equipment checkout, the media asset library (photos/
clips/recordings), and post-production distribution.

Read `docs/MEDIA_APP_BRIEF.md` first — it's the source of truth for scope, data model,
and build order. Then `backend/CLAUDE.md` and `frontend/CLAUDE.md` for stack conventions.

Status: **planning stage** — brief and conventions written, no code scaffolded yet.

## Stack

- `frontend/` — Next.js (App Router) + TypeScript + Redux Toolkit + Tailwind + shadcn/ui
- `backend/` — NestJS + TypeScript + MongoDB (Mongoose)
- Media storage: Cloudinary
