# Flow Map

## Product outcome

One controlled scholarship journey from public discovery through application, Foundation review, applicant communication, decision, and enrolment, with private data protected and every major administrative action traceable.

## Flow registry

| ID | Flow | Primary actor | Goal | Trigger | Success outcome | Entry flows | Exit flows | Depends on | Proof |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Discover scholarship | Visitor | Decide whether and how to apply | Opens public site | Reaches application with campaign context | External/referral | 02 | public content | Responsive public walkthrough |
| 02 | Start and resume application | Applicant | Create a recoverable application draft | Selects Apply | Authenticated or recoverable draft resumes at correct step | 01 | 03 | identity, campaign, persistence | New/resume browser test |
| 03 | Complete and submit application | Applicant | Submit a valid application and receive a reference | Completes staged form | Exactly one submitted record and application number | 02 | 04, 05 | validation, storage, idempotency | Mobile submission and duplicate-submit proof |
| 04 | Track and respond | Applicant | Understand status and satisfy requested actions | Opens portal/update | Sees current truth and completes required response | 03, 06, 07 | 06 | session, messages, documents, audit | Own-record and request-response proof |
| 05 | Find and review applicant | Reviewer | Reach a complete record and assess it | Opens admin applicant list | Review evidence and private note are saved | 03 | 06 | staff auth, permissions, search | Authorized review walkthrough |
| 06 | Decide or request information | Reviewer | Move an application through a valid lifecycle | Selects status/request action | Audited transition occurs and applicant sees permitted result | 05, 04 | 04, 07 | transition rules, audit, notifications | Status/request contract test |
| 07 | Communicate with applicants | Communications staff | Deliver durable information to the correct audience | Composes individual/bulk message | Portal record exists; external delivery is observable | 05, 06 | 04 | audience resolver, queue, permissions | Recipient and retry proof |
| 08 | Manage campaigns and staff | Super Admin | Configure opportunities and delegated access safely | Opens platform administration | Valid campaign/access change is active and audited | — | 01–07 | strong auth, audit, policy | Role/campaign authorization proof |

## Dependency order

| Batch | Kind | Includes | Depends on |
|---|---|---|---|
| shared-foundation | shared | identity/session, database, authorization, errors, validation, files, audit, observability | none |
| public-baseline | flow | Flow 01 | existing repository |
| golden-slice | flow | Flows 02, 03, 04, 05, 06 minimal path | shared-foundation, approved prototype |
| portal-completion | flow | Flow 04 complete states | golden-slice |
| admin-operations | flow | Flows 05 and 06 complete states | golden-slice |
| communications | flow | Flow 07 | portal-completion, admin-operations |
| platform-admin | flow | Flow 08 | shared-foundation, authorization proof |

## Surface and function coverage

- Existing `/`, `/scholarship`, `/programmes`, `/about`, `/faqs`, and `/contact` belong to Flow 01.
- `/apply` owns Flows 02 and 03.
- Applicant authentication is embedded in the goal it unlocks and serves Flows 02 and 04.
- Applicant dashboard, application, documents, messages, announcements, and timeline belong to Flow 04.
- Admin dashboard, applicant list, profile, review controls, and history belong to Flows 05 and 06.
- Communication center belongs to Flow 07.
- Campaign and staff management belong to Flow 08.
- Notifications, analytics, file storage, audit, and authorization are shared systems rather than user flows.

## Cross-flow edges

- Flow 01 -> 02: active campaign and selected programme/level context.
- Flow 02 -> 03: server-owned draft, current step, and version.
- Flow 03 -> 04: submitted application ID, application number, and applicant session.
- Flow 03 -> 05: immutable submission snapshot becomes reviewable.
- Flow 05 -> 06: reviewer action operates on a versioned application state.
- Flow 06 -> 04: permitted status explanation, request, message, and next action become visible.
- Flow 07 -> 04: audience-resolved portal message becomes durable before optional SMS delivery.
- Flow 08 -> all: campaign and permission changes affect behavior only after validation and audit.
