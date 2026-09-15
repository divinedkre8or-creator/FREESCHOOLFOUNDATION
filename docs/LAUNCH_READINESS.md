# Launch Readiness — Immediate Checklist

Last updated: 2026-09-15

## 1. Install manifest and applicant app

- `manifest.webmanifest` is connected globally and starts the installed app at `/portal`.
- The install line is rendered only inside the authenticated applicant portal after a real application loads.
- Android/Chromium receives the native install action when the browser exposes it.
- iPhone/iPad receives the concise **Share → Add to Home Screen** instruction.
- Supabase persists and refreshes the browser session. A valid session opens the dashboard directly; an expired or revoked session correctly returns the applicant to login.
- Installation still requires HTTPS on the final public domain. Localhost is permitted for development only.

## 2. Immediate technical launch checks

- [x] Hosted schema and launch seed respond through Supabase.
- [x] Active Citi Polytechnic campaign exists.
- [x] Five active programmes exist.
- [x] Email/password signup is enabled; phone authentication is disabled.
- [x] Email confirmation is required.
- [x] Production build, typecheck, unit tests, and lint complete without errors.
- [x] Manifest, icon, service worker, portal, admin-access, and admin-staff routes return HTTP 200 locally.
- [ ] Apply the second staff-access migration.
- [x] Lock the initial super-admin allowlist to `officialnwachukwudivine@gmail.com` before that account signs up.
- [ ] Complete one real confirmed applicant submission and portal re-login smoke test.
- [ ] Complete one real super-admin signup, role assignment, and wrong-role denial smoke test.
- [ ] Deploy to an HTTPS public URL.
- [ ] Set Supabase **Site URL** and allow `/apply`, `/login`, and `/admin-access` redirect URLs on that domain.
- [ ] Keep Supabase Auth confirmation/recovery delivery enabled and complete one real confirmation and recovery test.
- [ ] Verify a Resend sending domain, configure the server-only direct API variables, and complete submission/status/document-request/communications delivery tests.
- [ ] Approve Cloudmersive as a document subprocessor, store its API key as a Supabase Edge Function secret, deploy `scan-document`, and complete clean/rejected test uploads.
- [ ] Test Android Chrome and iPhone Safari on physical devices, including install/open behavior.
- [ ] Configure monitoring, error alert ownership, database backup/restore, and a rollback procedure.

## 3. Legal and privacy information requiring Foundation approval

This is an operational checklist, not legal advice. The Foundation's legal/privacy approver must approve the final public wording.

- The legal identity and contact details of The Free School Foundation as data controller, including a privacy-request email or phone.
- Every category collected: identity, contact details, date of birth, address, educational history, scholarship responses, documents, account/session information, and decision/message history.
- A specific purpose and lawful basis for each processing activity—not one blanket consent for everything.
- Who receives data and why, including authorized Foundation staff, Citi Polytechnic, Supabase, the hosting provider, and any future email/SMS or analytics provider.
- Whether information is processed or stored outside Nigeria and the safeguard used for any cross-border transfer.
- Concrete retention periods for incomplete drafts, unsuccessful applications, successful/enrolled applications, documents, messages, audit logs, and backups.
- How applicants exercise access, correction, objection, restriction, portability, erasure, consent withdrawal, and complaint rights.
- A direct internal remediation contact and the right to complain to the Nigeria Data Protection Commission.
- Whether people under 18 may apply and, if so, the parent/guardian authorization and child-data handling process.
- Cookie/local-storage/session disclosure, including authentication and installed-app behavior.
- Security and breach-response wording that is accurate and does not promise absolute security.
- Scholarship terms: eligibility, deadline/timezone, truthful-information declaration, verification, disqualification grounds, selection discretion, no guarantee of admission/award, and the fact that applying is free.
- Separate optional marketing consent from necessary application-service messages. The current application consent is for application-related communication only.
- Policy effective date, version, change-notice method, and named human approver.

Official reference points: [Nigeria Data Protection Act 2023](https://www.ndpc.gov.ng/ndp-act-2023/), [NDPC data-subject rights and controller responsibilities](https://ndpc.gov.ng/), and [NDPC privacy-policy structure](https://ndpc.gov.ng/our-data-privacy-policy/).

## 4. Implemented in code and awaiting hosted activation proof

- Admin applicant loading, filtering, selected/filtered phone export, audited status changes, private notes, document requests, individual portal messages, and status-targeted bulk portal communications use Supabase operations in code. Apply the pending staff-access migration and complete a real staff/applicant walkthrough.
- Automated Cloudmersive scanning, server-controlled scan state, quarantine, rejected-file removal, and clean-only staff downloads are implemented. Provider approval, secret configuration, Edge Function deployment, and live clean/rejected proof remain.
- Direct Resend API delivery is wired for post-confirmation application events and administrator communications. Domain verification, server secrets, deployment, and real delivery proof remain. Supabase continues to own confirmation and recovery email.
- Public `/privacy` and `/terms` pages are implemented and linked in the footer and application declaration. Their draft notices must remain until the Foundation's legal/privacy approver accepts the wording and retention periods.

## 5. Deferred or still incomplete

- SMS delivery is not connected.
- Automated end-to-end, accessibility, dependency-vulnerability, secret-scan, load, and constrained-network proof are not complete.
- Campaign editing remains a later administrative phase.
