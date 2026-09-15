# Client Questions

## Decisions that unblock correctness

### 1. Hosting and database — PARTIALLY RESOLVED

APPROVED: Supabase provides PostgreSQL and backend services. Remaining: confirm whether a Supabase project already exists and whether Cloudflare remains the web-hosting target.
Affected flows: all persistent flows. Owner: product/technical owner. Reversibility: medium; changing after data launch is a migration.

### 2. Applicant login

Recommended: phone OTP as the primary applicant sign-in with verified email captured as a recovery/contact option, provided SMS cost and delivery tests are acceptable. Otherwise use email OTP for the first release.
Affected flows: start/resume, portal tracking, document response. Owner: product owner. Reversibility: medium; identity migrations affect every applicant.

### 3. Staff login security

Recommended: email login plus mandatory MFA for all administrative roles.
Affected flows: review, communication, campaigns, staff administration. Owner: Foundation leadership. Reversibility: low before launch, high after incidents.

### 4. Documents and eligibility

Recommended: confirm the minimum initial documents and exact ND/HND eligibility with the academic partner before building rules; request nonessential documents only after shortlisting.
Affected flows: application, review, document requests. Owner: scholarship programme owner. Reversibility: high technically, but public-rule changes affect applicant fairness.

### 5. Post-submission corrections

Recommended: lock submitted answers by default; allow applicants to request correction while staff make or approve the change with audit history. Permit direct applicant uploads only for explicitly requested documents.
Affected flows: tracking/responding and review. Owner: scholarship programme owner. Reversibility: medium.

### 6. SMS provider and budget

Recommended: keep portal messages canonical, evaluate at least two providers for Nigerian delivery/sender-ID requirements, and set a per-campaign budget and batch limit before activation.
Affected flows: communication and security/abuse controls. Owner: product/finance owner. Reversibility: low because of the provider adapter.

### 7. Privacy, retention, and deletion

Recommended: name a Foundation privacy/legal approver and define retention for drafts, unsuccessful applications, approved/enrolled records, documents, messages, audit history, and backups before production.
Affected flows: all applicant and administrative flows. Owner: Foundation leadership/legal reviewer. Reversibility: low before launch; constrained after data collection.

## Confirm or correct

- ASSUMED: The current public visual language is the baseline to preserve.
- ASSUMED: PostgreSQL is the relational source of truth.
- ASSUMED: Application numbers use `FSF-YYYY-NNNNNN` and are references rather than credentials.
- ASSUMED: Portal messages remain available even when SMS delivery fails.
- ASSUMED: The public launch language is English; accessible plain language is required.
- ASSUMED: The operational business timezone is `Africa/Lagos`.

## Deferred or discoverable

- Exact schema details will be derived after the seven decisions above and reviewed in migrations.
- Component and responsive rules are discoverable from the current repository and the approved golden-flow prototype.
- Provider-specific environment variables and callback behavior are deferred until providers are selected.
- Production domains, DNS, deployment, paid activation, and real-data import are release-authority decisions and remain stopped.
