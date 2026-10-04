# Technical Design Specification: Resumption Mail Block Dispatch & Monitoring

**Date:** 2026-10-04  
**Status:** Approved  
**Author:** Antigravity Engineering  
**Scope:** Admin Communications, Applicant Review, Resumption Mail Automation, Block Cancellation  

---

## 1. Executive Summary & Problem Context

The Free School Foundation scholarship requires admitted scholars to resume physically at the **Aba Story Center** in Aba, Abia State, by a specified resumption deadline (October 15, 2027), while adhering to the church ministry ethos powering the scholarship.

Previously:
- The platform lacked a dedicated tracking mechanism to distinguish between **approved scholars who have already received their official resumption notice** versus **newly approved scholars who have not yet been notified**.
- In the Communications Hub (`/admin/communications`), selecting the "Approved" audience would indiscriminately target *all* approved candidates in history.
- Approving a new cohort (e.g., 10 candidates) posed a high risk of re-emailing previously notified students or failing to send resumption emails to the new cohort.

### Solution Goals:
1. **Dynamic Block Partitioning:** Automatically partition approved candidates into **Pending Block** (`resumptionEmailSent === false`) and **Delivered Block** (`resumptionEmailSent === true`).
2. **Block Cancellation:** Once a batch email is dispatched to the pending block, those candidates are immediately marked as notified, resetting the pending count to `0` ("canceled out").
3. **Automated Queueing:** Any newly approved candidate (whether approved one-by-one or in bulk) automatically populates the next pending block without affecting prior recipients.
4. **Hybrid Control (Option C):**
   - **Centralized Hub:** A dedicated Resumption Dispatch & Monitoring dashboard in `/admin/communications`.
   - **Inline Approval Trigger:** Direct action button and auto-send toggle inside the applicant review profile (`/admin/applicants/$applicationId`).
   - **Directory Transparency:** Mail status indicators in the applicant directory (`/admin/applicants`).

---

## 2. Architecture & Data Model

### 2.1 Database & State Attributes
To maintain data integrity without breaking existing schema or requiring high-risk migrations, tracking fields are stored directly in the `applications.personal` JSONB column (matching existing fields like `resumptionAttendanceConfirmed` and `resumptionAttendanceConfirmedAt`):

- `resumptionEmailSent`: `boolean` — `true` once official resumption notice has been delivered.
- `resumptionEmailSentAt`: `string` (ISO 8601 timestamp) — Exact time of dispatch.
- `resumptionEmailBatchId`: `string` (UUID) — Identifies the dispatch batch for auditing and traceability.

### 2.2 TypeScript Type Definitions (`src/lib/fsf.ts`)
Update `Application["personal"]`:
```typescript
export type Application = {
  // ...
  personal: {
    // ...
    resumptionEmailSent?: boolean;
    resumptionEmailSentAt?: string;
    resumptionEmailBatchId?: string;
    resumptionAttendanceConfirmed?: boolean;
    resumptionAttendanceConfirmedAt?: string;
    resumptionTargetDate?: string;
  };
};
```

### 2.3 Dynamic Block Logic
```typescript
// Pending Block: Candidates who need resumption mail
const pendingResumptionBlock = applications.filter((app) => 
  (app.status === "Approved" || app.status === "Enrolled") && 
  !app.personal.resumptionEmailSent
);

// Delivered Block: Candidates who already received resumption mail
const deliveredResumptionBlock = applications.filter((app) => 
  (app.status === "Approved" || app.status === "Enrolled") && 
  Boolean(app.personal.resumptionEmailSent)
);

// RSVP Confirmed: Candidates who responded on portal
const rsvpConfirmedCandidates = deliveredResumptionBlock.filter((app) =>
  Boolean(app.personal.resumptionAttendanceConfirmed)
);
```

---

## 3. Server Actions & Backend Workflow

### 3.1 Server Function: `adminDispatchResumptionEmailServerFn` (`src/lib/admin/admin-actions.ts`)
- **Input Schema:**
  ```typescript
  z.object({
    accessToken: z.string().min(20),
    applicationIds: z.array(z.string().uuid()).min(1).max(200),
    customSubject: z.string().trim().max(180).optional(),
    customBody: z.string().trim().max(5000).optional(),
  })
  ```
- **Execution Pipeline:**
  1. Authenticate user and verify staff permissions or Super Admin privileges.
  2. Query `applications` for target IDs; verify they are in `approved` or `enrolled` status.
  3. Resolve recipient email addresses and names from `applications.personal`.
  4. Build email content using `RESUMPTION_SUBJECT` and `RESUMPTION_BODY` (or customized copy).
  5. Post Portal Message into `public.messages` and `public.message_recipients` with `priority = 'high'`.
  6. Dispatch batch email via Resend Pro batch endpoint (`https://api.resend.com/emails/batch`) with deterministic idempotency key `fsf-resumption-{batchId}`.
  7. Update target records in `applications`:
     ```sql
     UPDATE public.applications
     SET personal = personal || jsonb_build_object(
       'resumptionEmailSent', true,
       'resumptionEmailSentAt', NOW(),
       'resumptionEmailBatchId', v_batch_id
     ),
     updated_at = NOW()
     WHERE id = ANY(target_ids);
     ```
  8. Record audit log entry in `public.audit_events`:
     - `action: 'application.resumption_batch_dispatched'`
     - `object_type: 'application_batch'`
     - `metadata: { recipient_count: N, batch_id: v_batch_id, application_ids: [...] }`
  9. Return `{ success: true, count: N, batchId: v_batch_id }`.

---

## 4. User Interface Specifications

### 4.1 Communications Hub (`/admin/communications`)
Add a dedicated top section above the standard compose form:
- **Card Title:** `Official Resumption Notice & Cohort Dispatch`
- **KPI Metrics Strip:**
  - **Awaiting Notice (Current Block):** `X Candidates` (Amber badge when > 0, Green "All Clear" when 0).
  - **Notified (Previous Blocks):** `Y Candidates` (Green badge).
  - **Aba Story Center RSVP Confirmed:** `Z Confirmed` (Brand Green badge).
- **Current Block Candidates Drawer/Table:**
  - Shows student Name, Application Number, Programme, and Approval Date.
- **Dispatch Action Bar:**
  - Primary button: `🚀 Dispatch Resumption Notice to Current Block (X Scholars)`
  - Confirmation Dialog explaining:
    - Number of scholars being emailed.
    - That this block will be canceled out upon completion.
    - Prevents accidental double-sends.
- **Zero-State Display:**
  - When pending block is 0: *"All approved scholars have received their resumption notices. Newly approved scholars will automatically queue here."*

### 4.2 Applicant Profile Dossier (`/admin/applicants/$applicationId`)
In the status & review dossier:
- When status is `Approved` or `Enrolled`:
  - **Resumption Mail Status Indicator:**
    - If Sent: `✓ Resumption Email Delivered on [Date]` (Soft green badge).
    - If Pending: `⏳ Resumption Email Pending Dispatch` (Soft amber badge).
  - **Action Button:**
    - If Pending: **`✉️ Send Resumption Notice & Attendance Link`** (triggers direct dispatch for this student, updating state to sent).
    - If Sent: **`🔄 Resend Resumption Notice`** (with confirmation dialog).
- In the **Status Change Dialog** (when transitioning an applicant to `Approved`):
  - Checkbox: `[x] Immediately dispatch official resumption & onboarding email to candidate` (checked by default).

### 4.3 Applicant Directory (`/admin/applicants`)
- Add a filter pill or dropdown option: `Resumption Mail: All | Pending Dispatch | Dispatched`.
- Add a compact mail indicator badge in table rows for approved candidates:
  - Green check mail icon: `Delivered`
  - Amber alert mail icon: `Awaiting Mail`

---

## 5. Security, Brand & Safety Considerations

- **Authorization Boundaries:** Only authenticated staff with `send_communications` permission or Super Admins can dispatch resumption emails.
- **Idempotency:** Unique batch digests prevent duplicate HTTP requests to Resend.
- **Brand Consistency:** Retains The Free School Foundation aesthetic, typography, and color tokens (`brand-green`, `brand-orange`, `card`, `secondary`).
- **Zero Data Loss:** All status changes are non-destructive and audited in `audit_events`.
- **Backward Compatibility:** Existing approved applicants with missing `resumptionEmailSent` flags default to `pending` unless marked sent via the verified September 29/October 4 message history.

---

## 6. Verification & Acceptance Criteria

1. **Clean Compilation:** `npm run build` succeeds with zero errors.
2. **Block Isolation:** Approving candidate A and dispatching email marks candidate A as delivered. When candidate B is subsequently approved, ONLY candidate B appears in the pending block.
3. **Single Dispatch Accuracy:** Clicking "Send Resumption Notice" in candidate B's profile dispatches only to candidate B and immediately updates their profile badge to "Delivered".
4. **Hub Synchronization:** The counters in `/admin/communications` immediately update in real-time when emails are dispatched.
5. **RSVP Integration:** Scholars receiving the email can log into `/portal` and click "Confirm Attendance / I Am Coming", updating the RSVP confirmed count.
