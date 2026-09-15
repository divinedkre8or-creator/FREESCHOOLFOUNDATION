# Free School Gateway Task Tracker

Last updated: 2026-09-15

This is the durable execution tracker. Update a row when work starts, becomes blocked, enters review, or finishes. `DONE` requires acceptance evidence, not only a code change.

## Summary

| Phase                         | Status      | Done / Total | Exit gate                                                   |
| ----------------------------- | ----------- | -----------: | ----------------------------------------------------------- |
| P0 Baseline and foundation    | IN_PROGRESS |        8 / 9 | Remaining Supabase project/policy decisions close the phase |
| P1 Shared platform foundation | IN_PROGRESS |        0 / 9 | Hosted schema and authorization smoke proof                 |
| P2 Golden vertical slice      | REVIEW      |       0 / 11 | UI implemented; Supabase/runtime proof pending              |
| P3 Applicant portal           | IN_PROGRESS |        0 / 7 | Core screens implemented; Supabase/runtime proof pending    |
| P4 Admin operations           | IN_PROGRESS |        0 / 7 | Core screens implemented; permission proof pending          |
| P5 Communications             | IN_PROGRESS |        0 / 6 | Portal UI implemented; queue/SMS pending                    |
| P6 Campaigns and staff        | IN_PROGRESS |        0 / 6 | Overview screens implemented; mutations pending             |
| P7 Release hardening          | PLANNED     |        0 / 9 | Release-readiness evidence accepted                         |

## P0 — Baseline and foundation

| ID    | Status  | Task                                                                    | Depends on | Acceptance / evidence                                                      |
| ----- | ------- | ----------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| P0-01 | DONE    | Clone and baseline repository                                           | —          | `main` tracks `origin/main`; clean clone confirmed                         |
| P0-02 | DONE    | Reconcile PRD with repository surfaces                                  | P0-01      | Product understanding recorded in `PROJECT_BIBLE.md`                       |
| P0-03 | DONE    | Define phases and durable task system                                   | P0-02      | `docs/IMPLEMENTATION_PLAN.md` and this tracker exist                       |
| P0-04 | DONE    | Run clean install, lint, typecheck, and build baseline                  | P0-01      | Results and defects recorded in `docs/BASELINE.md`                         |
| P0-05 | DONE    | Create source inventory, flow map, surface coverage, and flow contracts | P0-02      | Root foundation maps created and cross-checked                             |
| P0-06 | DONE    | Write security model and backend setup proposal                         | P0-02      | `SECURITY.md`, `BACKEND_SETUP.md`, and `CLIENT_QUESTIONS.md` created       |
| P0-07 | BLOCKED | Resolve architecture and policy decisions                               | P0-06      | Product owner decisions recorded; blockers listed below                    |
| P0-08 | DONE    | Prototype golden application-to-dashboard flow                          | P0-05      | Approved direction absorbed into production routes; throwaway HTML removed |
| P0-09 | DONE    | Approve golden-flow interaction direction                               | P0-08      | Owner directed sprint implementation on 2026-09-15                         |

## P1 — Shared platform foundation

| ID    | Status      | Task                                                     | Depends on   | Acceptance / evidence                                                      |
| ----- | ----------- | -------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| P1-01 | PLANNED     | Add test harness and project proof scripts               | P0-04        | Unit/integration/e2e commands run from package scripts                     |
| P1-02 | REVIEW      | Add relational schema and versioned migrations           | P0-07        | Atomic SQL prepared; owner SQL Editor run and hosted proof pending         |
| P1-03 | PLANNED     | Add idempotent local bootstrap and seed                  | P1-02        | Bootstrap passes twice without duplication                                 |
| P1-04 | REVIEW      | Implement applicant email/password authentication        | P0-07, P1-02 | Registration/login implemented; hosted confirmation/recovery proof pending |
| P1-05 | PLANNED     | Implement staff authentication and sessions              | P0-07, P1-02 | Staff security and expiry tests pass                                       |
| P1-06 | PLANNED     | Enforce roles and object ownership server-side           | P1-04, P1-05 | Unauthenticated, wrong-role, and cross-object denial proof                 |
| P1-07 | PLANNED     | Add server validation, errors, logging, and audit events | P1-02        | Redaction and correlation tests pass                                       |
| P1-08 | PLANNED     | Add private-file storage interface and local adapter     | P0-07        | Unauthorized file access is denied; expiry tested                          |
| P1-09 | IN_PROGRESS | Replace production reliance on demo `localStorage` state | P1-02, P1-06 | Applicant submission/read use Supabase; admin mutations remain local       |

## P2 — Golden vertical slice

| ID    | Status | Task                                                | Depends on   | Acceptance / evidence                                   |
| ----- | ------ | --------------------------------------------------- | ------------ | ------------------------------------------------------- |
| P2-01 | REVIEW | Application shell, progress, save state, and resume | P0-09, P1-09 | UI complete; server resume proof pending                |
| P2-02 | REVIEW | Personal-information stage                          | P2-01        | UI validation complete; Supabase contract proof pending |
| P2-03 | REVIEW | Level and programme stage                           | P2-01        | ND/HND UI complete; campaign enforcement pending        |
| P2-04 | REVIEW | Adaptive educational-background stage               | P2-03        | ND/HND branches implemented                             |
| P2-05 | REVIEW | Scholarship-information stage                       | P2-01        | Conditional fields and length UI implemented            |
| P2-06 | REVIEW | Initial document stage                              | P1-08, P2-01 | File UI complete; secure upload pending                 |
| P2-07 | REVIEW | Review, declaration, and consent stage              | P2-02..P2-06 | Review/edit and separate confirmations implemented      |
| P2-08 | REVIEW | Idempotent submission and application number        | P2-07        | UI success complete; database RPC proof pending         |
| P2-09 | REVIEW | Applicant dashboard summary and timeline            | P2-08        | Applicant overview implemented                          |
| P2-10 | REVIEW | Admin applicant list and complete profile           | P1-06, P2-08 | Search/list/profile UI implemented                      |
| P2-11 | REVIEW | Private note and audited status change              | P2-10        | UI complete; RLS/audit proof pending                    |

## P3 — Applicant portal

| ID    | Status      | Task                                         | Depends on   | Acceptance / evidence                                          |
| ----- | ----------- | -------------------------------------------- | ------------ | -------------------------------------------------------------- |
| P3-01 | REVIEW      | Submitted application detail                 | P2-09        | Applicant surface complete; ownership proof pending            |
| P3-02 | PLANNED     | Permitted post-submit corrections            | P0-07, P3-01 | Field/status rules enforced server-side                        |
| P3-03 | REVIEW      | Document requests and uploads                | P2-11        | Supabase request/upload/quarantine wired; hosted proof pending |
| P3-04 | REVIEW      | Portal messages and unread state             | P2-09        | Durable messaging/read state wired; hosted proof pending       |
| P3-05 | IN_PROGRESS | Targeted announcements                       | P3-04        | Announcement surface complete; targeting proof pending         |
| P3-06 | REVIEW      | Outstanding actions and status guidance      | P3-03, P3-04 | Human status and next-action UI implemented                    |
| P3-07 | PLANNED     | Session expiry, recovery, and failure states | P3-01..P3-06 | Interrupted and retry pathways proven                          |

## P4 — Admin operations

| ID    | Status      | Task                                      | Depends on          | Acceptance / evidence                                          |
| ----- | ----------- | ----------------------------------------- | ------------------- | -------------------------------------------------------------- |
| P4-01 | REVIEW      | Dashboard metrics and breakdowns          | P2-10               | Fixture-backed overview implemented                            |
| P4-02 | IN_PROGRESS | Applicant search, filters, and pagination | P2-10               | Search/filter/empty states complete; server pagination pending |
| P4-03 | REVIEW      | Complete administrative applicant profile | P2-10               | Unified profile surface implemented                            |
| P4-04 | IN_PROGRESS | Review and document-inspection workflow   | P3-03, P4-03        | Review UI complete; secure document view pending               |
| P4-05 | REVIEW      | Status-transition rules and history       | P2-11               | Server transition RPC/audit wired; hosted proof pending        |
| P4-06 | PLANNED     | Safe selection and bulk actions           | P4-02, P4-05        | Preview, permission, and partial-failure tests                 |
| P4-07 | IN_PROGRESS | Role-aware navigation and actions         | P1-06, P4-01..P4-06 | Admin shell complete; role variants pending                    |

## P5 — Communications

| ID    | Status  | Task                                    | Depends on   | Acceptance / evidence                                           |
| ----- | ------- | --------------------------------------- | ------------ | --------------------------------------------------------------- |
| P5-01 | REVIEW  | Individual portal messaging             | P3-04, P4-03 | Durable RPC and applicant notification UI; hosted proof pending |
| P5-02 | PLANNED | Audience query and recipient preview    | P4-02        | Preview matches resolved recipients                             |
| P5-03 | REVIEW  | Bulk portal messaging                   | P5-02        | Status-targeted durable send wired; failure proof pending       |
| P5-04 | PLANNED | Announcement authoring and targeting    | P3-05, P5-02 | Targeting and publish audit tested                              |
| P5-05 | PLANNED | SMS provider adapter and queue          | P0-07, P5-01 | Sandbox delivery, retries, redaction, and cost limits proven    |
| P5-06 | PLANNED | Delivery status and communication audit | P5-05        | Portal truth survives SMS failure                               |

## P6 — Campaigns and staff

| ID    | Status  | Task                                      | Depends on   | Acceptance / evidence                                 |
| ----- | ------- | ----------------------------------------- | ------------ | ----------------------------------------------------- |
| P6-01 | PLANNED | Campaign create/edit lifecycle            | P1-06        | Draft/active/closed state tests                       |
| P6-02 | PLANNED | Campaign programmes and eligibility       | P6-01        | Application adapts without code changes               |
| P6-03 | PLANNED | Campaign questions and document rules     | P6-01        | Dynamic requirements tested                           |
| P6-04 | PLANNED | Application-window enforcement            | P6-01        | Open/deadline/closed boundaries tested                |
| P6-05 | PLANNED | Staff invitation and activation lifecycle | P1-05, P1-06 | Expiry, resend, deactivate, and audit tests           |
| P6-06 | PLANNED | Roles and granular permission management  | P6-05        | Privilege escalation and last-admin safeguards proven |

## P7 — Release hardening

| ID    | Status      | Task                                               | Depends on   | Acceptance / evidence                                                     |
| ----- | ----------- | -------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| P7-01 | IN_PROGRESS | Responsive and cross-browser sweep                 | P2..P6       | Mobile-first layout pass complete; device/browser evidence still required |
| P7-02 | PLANNED     | Accessibility audit and remediation                | P2..P6       | Automated checks plus keyboard/screen-reader review                       |
| P7-03 | PLANNED     | Security and abuse review                          | P1..P6       | No unresolved critical/high findings                                      |
| P7-04 | PLANNED     | Performance and upload resilience                  | P2..P6       | Agreed budgets and constrained-network proof                              |
| P7-05 | PLANNED     | Backup, restore, migration, and rollback rehearsal | P1-02        | Isolated restore and replay evidence                                      |
| P7-06 | PLANNED     | Privacy, consent, retention, and deletion review   | P0-07        | Qualified approval recorded where required                                |
| P7-07 | PLANNED     | Monitoring, alerts, analytics, and support runbook | P1-07        | Failure injection reaches expected alerts                                 |
| P7-08 | PLANNED     | Preview acceptance walkthrough                     | P7-01..P7-07 | Product owner acceptance and open findings recorded                       |
| P7-09 | PLANNED     | Production release                                 | P7-08        | Explicit release authority; deployment and rollback evidence              |

## Current blockers and owner decisions

`P0-07` is blocked on product-owner decisions that materially affect security, cost, or public behavior:

1. Hosting/database preference and existing accounts.
2. ~~Applicant login method.~~ Resolved: email and password; phone is contact data only.
3. Staff login and whether multi-factor authentication is required.
4. Document-storage and SMS providers, or approval to recommend them.
5. Exact initial ND/HND documents and eligibility rules.
6. Post-submission editing policy.
7. Data retention/deletion policy and privacy/legal approver.

Work that does not depend on these decisions may continue. Vendor activation, spending, and production changes remain stopped until explicitly authorized.

## Activity log

| Date       | Task              | Event       | Evidence / note                                                                                                                                                                                                                                              |
| ---------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-15 | P0-01             | DONE        | Repository cloned at commit `ed1917c`                                                                                                                                                                                                                        |
| 2026-09-15 | P0-02             | DONE        | PRD and current public/application/admin scaffolding reconciled                                                                                                                                                                                              |
| 2026-09-15 | P0-03             | DONE        | Project Bible, phased plan, and durable tracker created                                                                                                                                                                                                      |
| 2026-09-15 | P0-04             | DONE        | Install/build pass; lint and typecheck failures documented in `docs/BASELINE.md`                                                                                                                                                                             |
| 2026-09-15 | P0-05             | DONE        | Source inventory, surface coverage, flow map, and flow contracts created                                                                                                                                                                                     |
| 2026-09-15 | P0-06             | DONE        | Security model, backend proposal, and bounded owner-decision batch created                                                                                                                                                                                   |
| 2026-09-15 | P0-07             | PARTIAL     | Supabase approved for auth, PostgreSQL, storage, and backend; remaining policy decisions stay open                                                                                                                                                           |
| 2026-09-15 | P1-01             | IN_PROGRESS | Supabase client/SSR packages, CLI, Vitest, scripts, env contract, and first config tests added                                                                                                                                                               |
| 2026-09-15 | P0-08             | REVIEW      | Golden application-to-dashboard prototype created; explicit owner decision pending                                                                                                                                                                           |
| 2026-09-15 | P0-09             | DONE        | Owner directed immediate production implementation using the established direction                                                                                                                                                                           |
| 2026-09-15 | P2-01..P2-09      | IN_PROGRESS | Production application, login, and applicant portal route batch added                                                                                                                                                                                        |
| 2026-09-15 | P4-01..P4-07      | IN_PROGRESS | Admin dashboard, applicants, profile, review, communications, campaigns, and staff screen batch added                                                                                                                                                        |
| 2026-09-15 | Sprint 01         | VERIFIED    | Build, typecheck, tests, and lint pass; Supabase runtime remains unverified without project credentials                                                                                                                                                      |
| 2026-09-15 | P7-01             | IN_PROGRESS | Connected the approved `public/favicon.png` logo with a Title Case wordmark; refined mobile navigation, application actions, portal tabs, admin lists, cards, spacing, and touch targets. All primary routes and logo return HTTP 200 locally.               |
| 2026-09-15 | P1-02             | BLOCKED     | FSF Supabase project linked and API keys validated; hosted schema is absent and migration push requires the separate database password.                                                                                                                      |
| 2026-09-15 | Brand assets      | DONE        | Approved Foundation logo and `citilogo.jpg` connected to shared partnership surfaces on Home, Scholarship, and About.                                                                                                                                        |
| 2026-09-15 | Launch auth       | REVIEW      | Applicant account creation and portal login use Supabase email/password; phone/application number are not accepted as credentials.                                                                                                                           |
| 2026-09-15 | Launch data       | REVIEW      | Production store starts empty, old browser fixtures invalidated, staff footer entry removed, admin route checks active staff membership, and applicant submit/read paths use Supabase.                                                                       |
| 2026-09-15 | P1-02             | REVIEW      | Atomic hosted-schema SQL and manual launch verification checklist prepared in `docs/LAUNCH_RUNBOOK.md`; owner SQL Editor execution remains pending.                                                                                                          |
| 2026-09-15 | P1-02             | VERIFIED    | Hosted schema, one active campaign, and five active programmes verified through the public RLS boundary after owner SQL execution.                                                                                                                           |
| 2026-09-15 | P1-04             | REVIEW      | Applicant email/password signup, confirmation, login, recovery, and persisted-session paths implemented; one real applicant walkthrough remains.                                                                                                             |
| 2026-09-15 | Install app       | REVIEW      | PWA manifest starts at `/portal`; authenticated-only install line, iOS guidance, service worker, and local HTTP route checks pass. Physical-device HTTPS installation remains unverified.                                                                    |
| 2026-09-15 | P6-05..P6-06      | REVIEW      | Secure staff bootstrap migration, scholarship-panel access route, role assignment, deactivation, audit events, and last-super-admin protection implemented; migration and exact owner allowlist remain pending.                                              |
| 2026-09-15 | Admin owner       | LOCKED      | `officialnwachukwudivine@gmail.com` is the sole automatic initial super-admin allowlist entry in the pending staff-access migration.                                                                                                                         |
| 2026-09-15 | Notifications     | REVIEW      | Supabase portal message delivery, normal/high priority, unread badge, high-priority banner, polling/visibility refresh, read state, and supported installed-app badging implemented; hosted migration/runtime proof pending.                                 |
| 2026-09-15 | Phone export      | REVIEW      | Scholarship panel loads authorized applications and exports selected or filtered applicant contact rows as spreadsheet-safe CSV; hosted staff-access migration/runtime proof pending.                                                                        |
| 2026-09-15 | Admin operations  | REVIEW      | Live Supabase applicant loading, audited status transitions, private notes, document requests, individual messaging, and status-targeted communications implemented in the pending staff migration and UI.                                                   |
| 2026-09-15 | Document security | REVIEW      | Server-controlled scan registration, Cloudmersive Edge Function, quarantine, clean-only staff access, and rejected-file deletion implemented; provider approval, secret, deployment, and hosted proof pending.                                               |
| 2026-09-15 | Resend email      | REVIEW      | Supabase/Resend connection runbook plus branded confirmation and recovery templates prepared; verified domain, DNS, SMTP configuration, and real delivery proof pending.                                                                                     |
| 2026-09-15 | Direct Resend     | REVIEW      | Owner clarified the delivery split: Supabase retains confirmation/recovery; direct server-side Resend API now handles submission, statuses, document requests, individual messages, and status-targeted communications. Secret/domain/runtime proof pending. |
| 2026-09-15 | Public legal      | REVIEW      | Public Privacy and Terms routes implemented, footer/declaration links connected, and draft notices retained pending Foundation legal/privacy approval and retention decisions.                                                                               |
| 2026-09-15 | Release checks    | VERIFIED    | Typecheck, lint (zero errors; eight existing Fast Refresh warnings), four tests, Vercel/Nitro production build, and local HTTP checks for Privacy, Terms, portal, admin access, and communications pass.                                                     |
| 2026-09-15 | Repository root   | DONE        | `FREESCHOOLFOUNDATION` is now the tracked application root on `main`, preserving the original cloned history; the old nested Git metadata remains as an ignored local backup only.                                                                           |
| 2026-09-15 | Vercel target     | REVIEW      | TanStack Start framework declaration and Nitro Vercel preset generate `.vercel/output`; hosted environment variables and deployed-route proof remain.                                                                                                        |
