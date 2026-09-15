# Free School Gateway Implementation Plan

## Outcome

Deliver a secure, mobile-first scholarship platform in which an applicant can discover an opportunity, submit a resumable application, receive a unique application number, track progress, respond to requests, and receive updates while authorized Foundation staff can review, communicate, decide, and maintain a complete audit trail.

## Delivery model

Work proceeds flow by flow. Each phase must leave the repository runnable. Tasks are tracked in `../TASK_TRACKER.md`; durable product rules belong in `../PROJECT_BIBLE.md`.

Status gates:

- `PLANNED` — scoped but not started
- `READY` — dependencies and decisions satisfied
- `IN_PROGRESS` — actively being implemented
- `BLOCKED` — cannot safely progress; blocker recorded
- `REVIEW` — implementation complete, proof pending
- `DONE` — acceptance criteria and evidence recorded

## Phase 0 — Baseline and foundation

Goal: make repository truth, product boundaries, and proof commands explicit.

Deliverables:

- Reconcile the PRD, current routes, demo models, and existing visual language.
- Establish typecheck, lint, unit/integration test, build, and runtime-proof commands.
- Record source inventory, surface coverage, flow contracts, security model, backend setup, and client decisions.
- Prototype the representative application-to-dashboard flow and obtain approval before major production UI work.
- Capture a clean baseline and document existing defects.

Exit gate: foundation documents are internally consistent, baseline commands are reproducible, and the golden-flow prototype is approved.

## Phase 1 — Shared platform foundation

Goal: replace demo-only trust boundaries with a secure application foundation.

Deliverables:

- Select and configure database, migrations, deterministic seed data, and local bootstrap.
- Implement applicant and staff authentication, sessions, recovery, and role-based authorization.
- Define server-owned domain models for campaigns, applications, responses, documents, messages, notes, and history.
- Add structured validation, error taxonomy, redacted logging, correlation IDs, rate limits, and audit events.
- Configure private object-storage abstraction and local development adapter.
- Preserve existing public-site appearance and routes.

Exit gate: a clean checkout bootstraps twice idempotently; unauthenticated, wrong-role, and cross-object access are denied by real server boundaries.

## Phase 2 — Golden vertical slice

Goal: prove the central journey from applicant entry to staff review using real persistence.

Deliverables:

- Create/resume application identity.
- Complete personal and programme stages with ND/HND branching.
- Complete education, scholarship responses, initial documents, review, declaration, and consent.
- Save drafts safely and resume on mobile.
- Submit idempotently and generate a server-owned `FSF-YYYY-NNNNNN` application number.
- Show applicant dashboard, status explanation, next action, and timeline.
- Show the submitted record in the admin applicant list and profile.
- Allow an authorized reviewer to add a private note and change status with audit history.

Exit gate: a real browser walkthrough proves Apply -> Submit -> Applicant Dashboard -> Admin Review against persistent storage.

## Phase 3 — Applicant portal completion

Goal: give applicants a reliable self-service view after submission.

Deliverables:

- Submitted-application review and permitted corrections.
- Requested-document upload with type, size, malware-scan hook, and access controls.
- Messages, announcements, unread state, and communication history.
- Outstanding-action indicators and human-readable status states.
- Session expiry, recovery, empty, failure, retry, and inaccessible-record behavior.

Exit gate: an applicant can access only their records, satisfy a document request, and see the resulting timeline/message updates.

## Phase 4 — Admin operations

Goal: provide the Foundation with complete day-to-day processing control.

Deliverables:

- Dashboard metrics and programme/status/level/date breakdowns.
- Applicant search, filters, pagination, selection, and safe bulk actions.
- Comprehensive applicant profile across all PRD sections.
- Review workflow, document inspection, status transition rules, notes, and audit history.
- Permission-aware admin navigation and action availability.
- Export requirements, if approved, with access logging and data minimization.

Exit gate: permitted staff roles can complete their assigned responsibilities while forbidden actions are rejected server-side.

## Phase 5 — Communications and announcements

Goal: make portal communication durable and external delivery observable.

Deliverables:

- Individual, selected, and filtered-audience portal messaging.
- Recipient preview and count before bulk sends.
- Targeted announcements by campaign, programme, level, and status.
- SMS provider adapter, queued delivery, retry policy, delivery state, and cost controls.
- Message templates and audit history.

Exit gate: portal messages remain canonical, recipient resolution is tested, and SMS failure never loses or duplicates the message.

## Phase 6 — Campaigns, staff, and platform administration

Goal: make the system reusable beyond the first ND/HND campaign.

Deliverables:

- Campaign lifecycle, dates, programmes, eligibility, questions, and document rules.
- Draft/active/closed behavior and application-window enforcement.
- Staff invitation, activation/deactivation, roles, granular permissions, and access audit.
- Super Admin safeguards for privilege changes.

Exit gate: a Super Admin can configure a future campaign and delegate limited staff access without code changes.

## Phase 7 — Hardening and release readiness

Goal: prove the complete product is safe, usable, observable, and recoverable.

Deliverables:

- Full responsive, accessibility, security, performance, and cross-browser review.
- Abuse tests for authentication, uploads, enumeration, bulk messaging, and authorization.
- Backup/restore rehearsal, migration replay, rollback plan, and operational runbook.
- Privacy notice, consent language, retention/deletion policy, and legal review status.
- Monitoring, alerting, analytics, error reporting, and support workflow.
- Preview deployment and stakeholder acceptance walkthrough.

Exit gate: build-evidence gates pass, all critical flows have fresh runtime proof, and production release remains an explicit owner-approved action.

## Flow dependency order

| Order | Actor-goal flow | Depends on |
|---:|---|---|
| 1 | Visitor discovers and evaluates a scholarship | Existing public foundation |
| 2 | Applicant starts and resumes an application | Identity, campaign, persistence |
| 3 | Applicant submits and receives an application number | Complete application, validation, idempotency |
| 4 | Applicant tracks status and required actions | Submission, messages, audit history |
| 5 | Reviewer finds and reviews an application | Staff auth, permissions, submitted application |
| 6 | Reviewer requests information and changes status | Review, documents, messages, audit history |
| 7 | Communications staff informs an audience | Permissions, recipient resolution, queue |
| 8 | Super Admin manages campaigns and staff | Strong authorization and audit controls |

## Cross-cutting verification

Every phase verifies:

- Mobile applicant pathway and keyboard-accessible desktop pathway.
- Loading, empty, validation, failure, interruption, retry, duplicate-action, and success states.
- Unauthenticated, wrong-role, cross-applicant, and private-note isolation.
- Server validation and object-level authorization for every mutation.
- No secrets or sensitive applicant data in client bundles, URLs, analytics, or logs.
- Tests, build, runtime walkthrough, and evidence path before tasks become `DONE`.

## Current architectural decisions to resolve

These are Phase 0/1 gates, not invitations to silently choose vendors:

1. Hosting and PostgreSQL provider.
2. Applicant/staff authentication method and account-recovery channel.
3. Private document-storage provider and retention policy.
4. SMS provider, sender identity, delivery regions, and budget controls.
5. Privacy/legal owner and approved consent/privacy language.
6. Whether applicants may edit submitted information, which fields, and until which status.
7. Required initial documents and exact ND/HND eligibility rules.
