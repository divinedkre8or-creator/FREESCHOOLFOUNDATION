# Project Bible

## Product intent

The Free School Gateway is the central scholarship platform for The Free School Foundation. It helps people discover and apply for opportunities, gives applicants a clear view of their progress, and gives authorized Foundation staff one operational system for review, communication, decisions, and enrolment.

The first campaign is a 100% funded ND/HND opportunity delivered with Citi Polytechnic through Open Distance Learning (ODL). The platform must remain campaign-neutral enough to support future university, certification, digital-skills, vocational, and partner programmes.

Primary product promise: applying should feel simple and transparent; administering the programme should feel controlled and traceable.

## Navigation and surfaces

### Public website

- `/` — opportunity-focused homepage
- `/scholarship` — scholarship details and eligibility
- `/programmes` — available courses and ND/HND context
- `/about` — Foundation identity and partnership explanation
- `/faqs` — applicant questions
- `/contact` — office and contact routes
- `/apply` — resumable staged application
- `/login` — applicant authentication and recovery

### Applicant portal

- Dashboard — application summary, status explanation, next action, messages
- Application — submitted answers and permitted corrections
- Documents — initial uploads and later requests
- Messages — durable Foundation communication
- Announcements — campaign-wide or targeted updates
- Timeline — applicant-visible status history

### Administration

- Dashboard — volume, status, programme, qualification, and attention metrics
- Applicants — search, filters, selection, and bulk actions
- Applicant profile — application, documents, private notes, messages, and audit history
- Communications — individual, selected, and audience-based messaging
- Announcements — publish and target portal notices
- Campaigns — configure scholarship opportunities and application windows
- Staff — roles, permissions, activation, and access review

Complex, resumable work uses pages. Short confirmations use dialogs. Context-preserving admin actions may use drawers on desktop and sheets on mobile. Validation and recoverable feedback stay inline where possible.

## Components and tokens

The existing React, TanStack, Tailwind, and Radix component foundation remains the baseline.

- Primary green: `--brand-green`
- Deep green: `--brand-green-dark`
- Opportunity accent: `--brand-orange`
- Supporting highlight: `--brand-yellow`
- Backgrounds: white and restrained green-tinted neutrals
- Typography: Plus Jakarta Sans with strong, readable hierarchy
- Shape: mostly 12–20px radii; avoid excessive pill and card treatment
- Elevation: quiet borders first, soft shadow only where hierarchy needs it

The public site should feel aspirational and human. Applicant surfaces should feel calm and reassuring. Admin surfaces should prioritize scanability and operational clarity.

## Interaction grammar

- Every form exposes label, help, validation, disabled, submitting, failure, and success states.
- The application autosaves after meaningful changes and shows save state without blocking progress.
- Users can leave and safely resume the last completed application step.
- Submission is an explicit commitment with review, declaration, and double-submit protection.
- Status changes explain both what happened and what the applicant should do next.
- Destructive or high-impact admin actions require confirmation and produce audit history.
- Bulk messages show the resolved recipient count and audience before sending.
- Keyboard navigation, visible focus, semantic headings, accessible error summaries, and 44px mobile targets are required.

## Motion and haptics

Use motion only to explain continuity, progress, disclosure, or completion. Default transitions should be short (approximately 150–220ms), interruptible, and disabled or simplified under reduced-motion preferences. This is a web product; native haptics are not claimed.

## Architecture and state

Current repository truth:

- TanStack Start/Router and React 19 provide the application shell.
- Public content routes are implemented.
- `src/lib/fsf.ts` and `src/lib/store.tsx` contain demo domain data and browser `localStorage` state.
- There is currently no production database, authentication, authorization, secure file storage, or SMS integration.

Target boundaries:

- The server owns identity, authorization, application numbers, status transitions, audit history, and persistent records.
- The browser owns transient UI state and unsent form input only.
- A relational database is the source of truth for campaigns, users, applications, reviews, communication, and audit events.
- Private documents use object storage with server-authorized, time-limited access.
- External message delivery is asynchronous and must not erase the canonical portal message when SMS fails.

Offline submission is not promised. Draft recovery after reconnect and clear retry behavior are required.

## APIs and events

Initial domain events:

- `application.draft_saved`
- `application.submitted`
- `application.status_changed`
- `document.requested`
- `document.uploaded`
- `message.created`
- `message.delivery_attempted`
- `announcement.published`
- `staff.permissions_changed`

Mutation endpoints require authenticated actors where applicable, server-side validation, authorization at the object boundary, idempotency for submission and message dispatch, correlation IDs, and redacted logs.

## Roles and permissions

| Actor/role | Own application | Other applications | Private notes | Communications | Campaigns | Staff access |
|---|---:|---:|---:|---:|---:|---:|
| Visitor | Start | No | No | No | View active | No |
| Applicant | View/update permitted fields | No | No | Receive/reply where enabled | View active | No |
| Reviewer | No personal ownership bypass | Review assigned/permitted | Create/view | Applicant-specific if granted | View | No |
| Communications | No personal ownership bypass | Audience fields only as needed | No | Send individual/bulk | View | No |
| Viewer | No | Read permitted records | No | Read permitted history | View | No |
| Super Admin | Operational access | Full authorized access | Full | Full | Manage | Manage |

All permissions are enforced on the server. Hiding an interface control is never authorization.

## Decision log

| Status | Decision | Owner | Evidence / affected flows |
|---|---|---|---|
| LOCKED | Free School Foundation is the primary product brand. | Product owner | PRD; all surfaces |
| LOCKED | Current campaign supports ND/HND and five listed programmes. | Product owner | PRD; discovery and application |
| LOCKED | Applicant experience is mobile-first and application is staged/resumable. | Product owner | PRD; application flow |
| LOCKED | Internal notes are never visible to applicants. | Product owner | PRD; admin review and applicant portal |
| LOCKED | Major status changes remain in immutable application history. | Product owner | PRD; review and tracking |
| ASSUMED | Existing visual tokens and public UI patterns remain the approved baseline. | Build team | Current repository; all human-facing flows |
| APPROVED | Supabase provides authentication, PostgreSQL persistence, storage, and backend services. | Product owner | 2026-09-15 instruction; all persistent flows |
| ASSUMED | Email OTP is the initial applicant authentication method until phone OTP delivery and cost are approved. | Build team | Authentication; application and portal flows |
| ASSUMED | Staff use email authentication with MFA required before production release. | Build team | Authentication; administrative flows |
| ASSUMED | Portal messages are canonical; SMS is an additional delivery channel. | Build team | PRD; communication flow |

Architecture vendors, authentication mechanism, hosting, object storage, SMS provider, retention periods, and legal/privacy copy remain explicit Phase 1 decisions.
