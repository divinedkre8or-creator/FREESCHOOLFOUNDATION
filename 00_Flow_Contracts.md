# Flow Contracts

## Global contracts

| ID | Applies | Owner | Contract | Verification |
|---|---|---|---|---|
| identity-session | Flows 02–08 | Shared foundation | Server-issued sessions; applicant and staff identities are distinct; expiry and recovery are explicit | Auth integration and expiry tests |
| authorization | Flows 02–08 | Shared foundation | Every protected read/mutation checks role, permission, and object ownership on the server | Unauthenticated, wrong-role, cross-object smoke tests |
| error-taxonomy | All flows | Shared foundation | Stable codes with human messages; validation is field-addressable; internal details are redacted | Contract and UI error-state tests |
| observability | Flows 02–08 | Shared foundation | Correlation ID across request/event/delivery; logs exclude secrets, document contents, essays, and unnecessary PII | Redaction and correlation tests |
| audit-history | Flows 03–08 | Shared foundation | Major transitions record actor, action, object, prior/next state, and server time; applicants see only permitted history | Audit integration and isolation tests |
| private-files | Flows 03–06 | Shared foundation | Metadata in database; bytes in private object storage; validated upload; time-limited authorized retrieval | File type/size/access/expiry tests |
| notifications | Flows 03, 06, 07 | Shared foundation | Portal record is canonical; SMS is queued delivery with retries and observable failure | Queue idempotency and failure tests |
| analytics | Flows 01–08 | Shared foundation | Minimized event schema; no sensitive answers or document data; consent rules respected | Payload inspection |

## Flow 01 -> Flow 02

- Trigger: visitor selects Apply from an active campaign surface.
- Data: campaign ID plus optional programme and qualification preselection.
- Enforcement: server validates campaign is open and choices remain eligible.
- Failure: closed or invalid campaign returns a clear public explanation and safe return path.
- Proof: deep-link and stale-campaign integration tests.

## Flow 02 -> Flow 03

- Data: applicant-owned draft, schema version, last valid step, server timestamp, and optimistic version.
- Preconditions: recoverable applicant identity/session and active campaign.
- Concurrency: stale draft writes are rejected or reconciled; last-write-wins is not silently assumed.
- Cancellation: leaving a valid step preserves the last confirmed server draft.
- Proof: resume, expiry, offline/reconnect, and two-tab conflict tests.

## Flow 03 -> Flows 04 and 05

- Submission is one idempotent transaction that validates the complete application, captures declarations, assigns the application number, and appends history.
- Application numbers are server-generated and unique; clients never reserve or calculate them.
- Flow 04 receives the applicant-permitted projection. Flow 05 receives the reviewer-permitted projection.
- Retrying the same submission key returns the original success and never creates a second record.
- Proof: duplicate-submit, rollback, projection-isolation, and application-number uniqueness tests.

## Flow 05 -> Flow 06 -> Flow 04

- Reviewer mutations include the application version to prevent silent overwrites.
- Transition rules reject invalid lifecycle jumps and missing required reasons.
- Private notes stay on the admin projection only.
- Document requests and applicant-visible changes create permitted history and a portal message in the same durable operation or recover through an outbox.
- Proof: role matrix, invalid transition, concurrent review, private-note isolation, and outbox recovery tests.

## Flow 07 -> Flow 04

- Recipient resolution is a server-side snapshot shown as count and audience summary before confirmation.
- Send confirmation uses an idempotency key and creates one portal message per resolved recipient.
- SMS delivery references the canonical message and may retry without duplicating portal content.
- Cancellation before confirmation has no external effect; partial delivery remains inspectable and retryable.
- Proof: audience drift, duplicate send, partial failure, opt-out/consent, and cost-limit tests.

## Flow 08 -> all flows

- Campaign and permission mutations require Super Admin authorization and audit history.
- Campaign publication validates dates, programmes, questions, eligibility, documents, and public content as one coherent version.
- Staff deactivation invalidates active sessions within the defined security window.
- Privilege changes cannot remove the last active Super Admin without a separately approved recovery path.
- Proof: publish validation, application-window boundaries, privilege escalation, session revocation, and last-admin tests.
