# Backend Setup Proposal

## Current state

The repository is a TanStack Start application configured to produce a Cloudflare-module build. Public routes are real; application/admin behavior is represented only by TypeScript demo fixtures and browser `localStorage`. No persistent or authorization boundary exists yet.

## Recommended architecture

Supabase was approved by the product owner on 2026-09-15 for authentication,
PostgreSQL, storage, and backend services. Authentication channel and production
provider settings remain governed by `CLIENT_QUESTIONS.md`.

| Concern | Recommended direction | Why it fits |
|---|---|---|
| Web/server runtime | Keep TanStack Start and the existing Cloudflare-compatible deployment target | Preserves the cloned architecture and UI investment |
| Database | Supabase PostgreSQL | Approved platform with transactions, reporting, audit support, and RLS |
| Data access | Supabase client plus explicit SQL migrations and generated types | Uses the approved platform while keeping schema and authorization reviewable |
| Validation | Shared Zod schemas with server enforcement | Already present; supports field-level errors and contract tests |
| Authentication | Supabase Auth behind repository-owned browser/server helpers | Supports SSR sessions while keeping policy testable |
| Files | Private Supabase Storage bucket with database-backed metadata and RLS | Keeps file authorization aligned with application ownership |
| Async work | Transactional outbox plus queue/worker | Prevents lost communication when SMS delivery fails |
| SMS | Provider adapter selected after Nigeria delivery/cost review | Avoids coupling portal truth to one vendor |
| Testing | Unit/integration plus Playwright browser flows | Covers contracts and mobile applicant journeys |

Cloudflare/TanStack SSR cookie compatibility and the selected Supabase region must be proven in preview before release.

## Domain model

Initial server-owned entities:

- `users` and authentication identities
- `staff_profiles`, `roles`, `permissions`, and role assignments
- `campaigns`, campaign programmes, eligibility rules, questions, and document requirements
- `applications`, draft versions, selected programme/level, declaration, consent, submission metadata
- personal, educational, and scholarship response records or a versioned response model
- `application_documents` with private storage metadata and scan state
- `application_status_history` and operational audit events
- `internal_notes`
- `portal_messages`, recipients, threads if replies are enabled, and read state
- `announcements` and audience rules
- `outbox_events` and external delivery attempts

The schema must enforce one applicant application per approved campaign rule, unique application numbers, valid foreign keys, explicit timestamps, and concurrency/version fields where multiple writers are possible.

## Application lifecycle

Canonical statuses:

`Draft -> Submitted -> Under Review -> Shortlisted -> Additional Documents Required -> Approved -> Enrolled`

`Not Successful` is a terminal decision route subject to approved reopen policy. Returning from `Additional Documents Required` to review must be modeled explicitly rather than inferred from label order. Exact allowed transitions and required reasons will be documented and tested before activation.

## Server contracts

Initial contract groups:

- Public: list active campaign and public programme/eligibility content.
- Applicant identity: register/sign in, recover, sign out, and session view.
- Draft: create, read own, save versioned stage, resume, and abandon according to retention rules.
- Submission: validate complete draft and submit idempotently.
- Applicant portal: own dashboard, own application projection, own messages, own announcements, own requested documents.
- Admin review: permitted list/filter, permitted profile, note, document request, and valid status transition.
- Communication: resolve audience, preview count, confirm idempotent portal send, queue external delivery.
- Platform admin: campaign lifecycle and staff/permission lifecycle.

Errors use stable machine codes plus safe human messages. Every mutation records correlation and audit context.

## Application number

Format: `FSF-YYYY-NNNNNN`.

The server assigns it inside the submission transaction using a concurrency-safe database mechanism. The sequence may be annual and campaign-aware internally, but the visible format remains Foundation-wide unless the product owner changes it. It is a public reference, never an authorization token.

## Persistence and migrations

- Versioned SQL migrations live in the repository and are never edited after application.
- A deterministic development seed uses synthetic people and documents only.
- Bootstrap creates local configuration, applies migrations, and seeds only when required.
- Bootstrap must pass twice without duplicate records or destructive resets.
- Migration replay from zero and against the current schema is part of verification.
- Production rollback defaults to forward repair for data migrations unless an engine-specific, proven rollback is safer.

## Files

- Database stores owner, campaign, application, type, original display name, safe storage key, size, detected MIME, checksum, upload time, scan state, and access/audit state.
- Object storage is private by default.
- Upload authorization and retrieval authorization are separate checks.
- Local development uses a repository-owned adapter with behavior equivalent enough to test access and expiry; it is not production proof.

## Messaging and jobs

A database transaction writes the portal message and outbox event. A worker attempts SMS delivery after commit. Delivery attempts use provider idempotency/replay controls and store safe status metadata. Retry uses bounded exponential backoff; permanent failure remains visible to staff without deleting the portal message.

## Environment keys

Names are provisional until providers are approved; secret values never enter the repository.

- `DATABASE_URL` — application database connection
- `AUTH_SECRET` — session/authentication signing material
- `APP_BASE_URL` — canonical application origin
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` — private file storage
- `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` — external delivery
- `LOG_LEVEL` and approved observability credentials — redacted operational telemetry

An `.env.example` will be created when vendors and local adapters are selected.

## Local bootstrap target

Phase 1 will add project-owned commands for:

1. locked dependency install;
2. local service startup or approved hosted development connection;
3. database creation and migration;
4. deterministic synthetic seed;
5. application start;
6. migration replay;
7. real-caller authorization smoke proof.

These commands will populate `verification/commands.json`; placeholders are not considered executable proof.

## Deployment, monitoring, and recovery

- Preview and production are separate environments with separate databases, storage, auth credentials, SMS credentials, and observability.
- Deployments run typecheck, lint, tests, build, migration safety checks, and runtime smoke paths.
- Health checks cover web runtime, database reachability, storage adapter, queue/outbox backlog, and SMS delivery degradation without exposing secrets.
- Rollback and restore are rehearsed on isolated data before release.
- Production deployment, provider activation, DNS, and spending require explicit authority.
