# Sprint 01 — Screen Foundation

Date: 2026-09-15

## Outcome

The broken application, applicant-login, and staff-admin links now resolve to a coherent product surface. The screen layer uses the existing Foundation visual language and the repository's current demo store while Supabase credentials and live service functions are connected next.

## Added routes

- `/apply` — six-stage responsive application with ND/HND branching, validation, document selection, review, declarations, submission confirmation, and application number.
- `/login` — applicant access surface, explicitly labeled as demo access until Supabase Auth is connected.
- `/portal` — overview, submitted application, documents, messages, announcements, and timeline.
- `/admin` — operational dashboard and application pipeline.
- `/admin/applicants` — search and filters across status, level, and programme.
- `/admin/applicants/$applicationId` — full profile, documents, history, status action, private notes, and individual messaging.
- `/admin/communications` — audience selection, recipient preview, bulk portal messages, and announcements.
- `/admin/campaigns` — campaign overview and management entry points.
- `/admin/staff` — staff, roles, permissions, and access overview.

## Backend foundation

- Official Supabase browser and SSR packages and validated environment contract.
- Supabase CLI configuration and versioned PostgreSQL schema with RLS policies.
- Transactional application submission and Foundation application numbering function.
- Private document bucket policies and deterministic programme/campaign seed.
- Vitest, typecheck, Supabase, and formatting scripts.

## Verification

| Check | Result |
|---|---|
| `bun run build` | PASS |
| `bun run typecheck` | PASS |
| `bun run test` | PASS — 1 file, 2 tests |
| `bun run lint` | PASS — zero errors; eight pre-existing Fast Refresh warnings |
| Supabase migration replay | UNVERIFIED — hosted project not linked; optional local emulator was stopped |
| Auth/RLS runtime proof | UNVERIFIED — Supabase project URL and keys not configured |

## Mobile-first refinement

- Replaced the unavailable Lovable-only logo URL with the approved `public/favicon.png` asset and a readable Title Case wordmark.
- Converted applicant and staff tables to readable mobile cards while preserving desktop tables.
- Replaced horizontally scrolling applicant-portal navigation with a phone-friendly grid.
- Reflowed narrow-screen form actions, admin headers, document rows, campaign metadata, and long email/file text.
- Standardized primary touch targets to at least 44px and retained 16px mobile form text.
- Local runtime smoke check: `/`, `/apply`, `/login`, `/portal`, all primary `/admin` routes, and `/favicon.png` return HTTP 200.

Local preview: `http://localhost:4173`

## Next sprint boundary

Replace the demo store for the golden flow with Supabase Auth and server-backed application services. Prove applicant ownership, wrong-role denial, private-note isolation, submission idempotency, and document access against the linked Supabase project.
