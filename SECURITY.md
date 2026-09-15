# Security Model

## Scope and sensitive data

The platform processes identity/contact data, dates of birth, addresses, passport photographs, educational records, scholarship responses, uploaded documents, application decisions, private staff notes, message history, and staff access records. These categories are confidential even when they are not financial or medical data.

The Free School Foundation is the operational data owner. Applicants own access to their own applicant-facing records; staff access is delegated by role and business need.

## Trust boundaries

1. Public browser to public application routes.
2. Applicant browser to authenticated applicant server functions.
3. Staff browser to authenticated administrative server functions.
4. Server runtime to relational database.
5. Server runtime to private object storage.
6. Server/outbox worker to SMS provider.
7. Observability pipeline receiving redacted operational events.

Anything received from the browser, URLs, headers, uploaded files, provider callbacks, or queued jobs is untrusted until validated and authorized.

## Authentication

- Applicant and staff accounts use separate policy profiles even if implemented by one identity service.
- Sessions use secure, HTTP-only, same-site cookies and server-side validation.
- Staff authentication requires stronger recovery controls and is recommended to require MFA before production.
- Login, OTP, recovery, invitation, and resend endpoints are rate-limited and do not reveal whether an account exists.
- Staff deactivation and high-risk permission changes revoke active sessions within a defined maximum window.
- Authentication vendor and applicant login method require product-owner approval.

## Authorization matrix

| Action | Applicant | Reviewer | Communications | Viewer | Super Admin |
|---|---:|---:|---:|---:|---:|
| Read own applicant projection | allow | n/a | n/a | n/a | operational only |
| Read another applicant | deny | permitted scope | minimized audience fields | permitted read scope | allow |
| Edit draft | own draft only | deny | deny | deny | support operation only if explicitly designed |
| Change status | deny | with permission | deny | deny | allow |
| Read/write private notes | deny | with review permission | deny | deny | allow |
| Request/read documents | own request/upload view | with document permission | deny by default | deny by default | allow |
| Send communication | receive/reply where enabled | if granted | with permission | deny | allow |
| Manage campaign | deny | deny | deny | deny | allow |
| Manage staff/permissions | deny | deny | deny | deny | allow with safeguards |

Every allow decision is enforced on the server against the authenticated actor, required permission, campaign scope, and target object. Interface visibility is secondary only.

## Object ownership and projections

- Applicants query by authenticated user ownership, never by trusting an application ID alone.
- Administrative queries use explicit permission and campaign scope.
- Applicant projections exclude internal notes, staff-only reasons, risk flags, other applicants, internal delivery details, and private audit metadata.
- File access uses short-lived server-authorized URLs bound to permitted object metadata.
- Sequential application numbers are references, not secrets; knowing one never grants access.

## Input and upload security

- Validate all request payloads on the server with strict schemas and bounded lengths.
- Normalize phone/email fields while preserving the user-facing representation needed for contact.
- Reject executable, archive, and ambiguous/polyglot uploads in the initial release.
- Enforce approved MIME types, extension agreement, maximum size, file count, and campaign document rules.
- Generate storage keys server-side; never reuse user filenames as paths.
- Add malware scanning before staff retrieval in production; quarantine pending/failed scans.
- Serve documents as attachments where safe and prevent indexing/caching by public intermediaries.

## Application and workflow abuse

- Rate-limit application creation, authentication, recovery, upload, and communication endpoints.
- Use idempotency keys for application submission, status-affecting commands, bulk message dispatch, and provider callbacks.
- Use optimistic versions for drafts and administrative review to prevent silent concurrent overwrites.
- Enforce campaign opening/deadline rules on the server using a declared business timezone.
- Treat bulk recipient resolution as a versioned snapshot and re-confirm material changes.
- Apply SMS budget, batch-size, and per-recipient duplicate controls before provider dispatch.

## Audit and observability

Audit major security and operational events: login/recovery, submission, status transition, document request/access, note creation, communication send, campaign publication, permission change, staff deactivation, and export.

Audit entries capture server time, actor, action, object, outcome, correlation ID, and necessary before/after metadata. They do not store secrets, OTP values, document contents, scholarship essays, or redundant PII.

Operational logs redact credentials, cookies, tokens, signed URLs, phone/email where unnecessary, uploaded content, and free-text applicant responses.

## Privacy, retention, and deletion

- Collect only fields needed for scholarship processing.
- Explain purpose and retention in applicant-facing privacy information.
- Communication consent is separate from declaration acceptance.
- Retention periods, deletion/anonymization rules, export rights, and legal-review ownership require explicit approval before production.
- Backups must follow the same deletion and access policy within technically documented recovery limits.

## Recovery and destructive actions

- Migrations are versioned, reviewed, rehearsed from zero, and paired with a recovery plan.
- Material deletion uses narrow targets, confirmation, authorization, audit, and a recoverable soft-delete stage where appropriate.
- Backup existence is not considered proof until an isolated restore succeeds.
- Production data resets, bulk deletion, and privilege recovery are explicit stop conditions.

## Required security proof

- Unauthenticated requests denied.
- Applicant-to-applicant cross-object access denied.
- Wrong staff role denied.
- Private notes absent from applicant API and rendered output.
- Unauthorized/private-file retrieval denied, including expired access links.
- Duplicate submission and messaging commands remain single-effect.
- Session expiry, staff deactivation, password/OTP abuse, upload abuse, and provider callback replay tested.
- Logs and analytics inspected for sensitive-data leakage.
