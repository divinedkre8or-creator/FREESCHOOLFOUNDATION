# Golden Application Flow Prototype Brief

Status: APPROVED and absorbed into production routes on 2026-09-15. The throwaway
HTML review surface was removed after the product owner directed sprint implementation.

Goal: An applicant completes a mobile scholarship application, submits once, receives an application number, and understands the next step.
Human and feel: A cost-conscious Nigerian applicant using a phone; calm, hopeful, clear, and recoverable.
Entry and exit: Starts from the public Apply CTA; exits to the applicant dashboard or safely back to the public site.
System: Standalone read-only prototype using the existing green/orange/yellow tokens, spacious page flow, and quiet borders.
Signature: A persistent “saved” pulse and plain-language journey summary connect form progress to applicant reassurance.
Feedback: 180ms transitions, immediate inline validation, polite live announcements, no browser haptic claims.
Rejecting: One giant form; false urgency or celebratory noise.
Variants: ND/HND education fields; phone-first layout with a desktop review viewport.

## State and transition map

| From          | Trigger        | Guard/input           | To                 | Container     | Feedback                                     | Recovery/exit                   |
| ------------- | -------------- | --------------------- | ------------------ | ------------- | -------------------------------------------- | ------------------------------- |
| Public entry  | Apply          | Campaign open         | Personal           | Page          | Progress 1/6                                 | Exit to public site             |
| Any form step | Continue       | Valid fields          | Next step          | Page          | Saved indicator + live announcement          | Back preserves mock state       |
| Any form step | Continue       | Invalid fields        | Same step          | Inline        | Error summary and field focus                | Correct and retry               |
| Programme     | Select level   | ND or HND             | Education variant  | Page          | Relevant fields replace previous variant     | Back/change level               |
| Documents     | Add file       | Supported mock file   | Documents complete | Inline        | Upload progress then success                 | Remove/retry                    |
| Review        | Submit         | Declaration + consent | Submitting         | Page          | Blocking progress, duplicate action disabled | Simulated error/retry           |
| Submitting    | Success        | Deterministic mock    | Confirmation       | Page          | Application number + next action             | Continue to dashboard           |
| Confirmation  | View dashboard | Submitted             | Dashboard          | Page          | Human status explanation                     | Exit to public site             |
| Any step      | Offline/error  | Review control        | Recoverable state  | Inline banner | Warning live announcement                    | Retry or continue after restore |
| Any step      | Session expiry | Review control        | Re-auth prompt     | Modal         | Focus trapped; warning                       | Mock sign-in returns to step    |
| Any step      | Exit           | Unsaved/active draft  | Confirmation       | Modal         | Focus trapped                                | Keep working or exit            |

Permission denial is N/A for the representative path because camera capture is not required; document selection uses the platform file picker. Real authentication, persistence, upload scanning, and submission are mocked and unverified in this prototype.
