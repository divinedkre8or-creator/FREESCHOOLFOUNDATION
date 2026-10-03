# Selective Approval Revocation, Bulk Revoke Button Removal & Resumption Attendance Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely revoke scholarship approvals made before September 29th while preserving all approvals on or after September 29th; permanently remove the bulk revoke button from the admin UI; add a portal attendance confirmation (RSVP) mechanism for approved students to indicate they are coming to the physical Story Center in Aba by Thursday, October 15, 2027; display real-time attendance headcounts to Foundation administrators; and configure the official resumption message template in the Communications dashboard.

**Architecture:**
- **Pre-Sept 29 Revocation:** Safe SQL transaction using `public.application_status_history` and `public.applications` to rollback only approvals prior to `2026-09-29T00:00:00Z` to `under_review`, maintaining full audit traceability without touching post-Sept 29 approvals.
- **Button Cleanup:** Remove the "Revoke Enrolled" button and modal from `src/routes/admin.applicants.index.tsx`.
- **Attendance Confirmation (RSVP):** Server function `confirmResumptionAttendanceServerFn` verifying caller identity and ownership, updating `personal` JSONB with `physicalAttendanceAcknowledged: true` and `resumptionConfirmedAt: ISOString`.
- **Student Portal:** In `src/routes/portal.tsx`, render a prominent Resumption Notice banner for approved applicants with school ethos (church ministry partnership), Aba Story Center location, deadline of Thursday, October 15, 2027, and an interactive confirmation button.
- **Admin Headcount Visibility:** Show attendance status badge in `src/routes/admin.applicants.index.tsx` so staff can see exact incoming numbers.
- **Communications Dispatch:** Pre-fill the approved applicants email/portal message template in `src/routes/admin.communications.tsx`.

**Tech Stack:** React 19, TanStack Router / TanStack Start Server Functions, Supabase PostgreSQL, Tailwind CSS, Lucide React, Resend.

---

### Task 1: Safe Pre-September 29 Selective Revocation (Database Verification & Execution)

**Files:**
- Create: `supabase/migrations/20261003_revoke_pre_sept29_approvals.sql`
- Target Database: Supabase PostgreSQL (`applications`, `application_status_history`, `audit_events`)

- [ ] **Step 1: Write dry-run inspection query to verify counts before touching records**

```sql
-- 1. Dry run inspection: Count and list applications approved before Sept 29, 2026
WITH app_approvals AS (
  SELECT 
    a.id,
    a.application_number,
    a.status,
    COALESCE(
      (
        SELECT MAX(h.created_at) 
        FROM public.application_status_history h 
        WHERE h.application_id = a.id AND h.to_status = 'approved'
      ),
      a.updated_at
    ) AS effective_approved_at
  FROM public.applications a
  WHERE a.status IN ('approved', 'enrolled')
)
SELECT 
  COUNT(*) FILTER (WHERE effective_approved_at < '2026-09-29T00:00:00Z') AS to_be_revoked_count,
  COUNT(*) FILTER (WHERE effective_approved_at >= '2026-09-29T00:00:00Z') AS preserved_approved_count,
  COUNT(*) AS total_currently_approved
FROM app_approvals;
```

- [ ] **Step 2: Create atomic revocation SQL migration with audit trails**

```sql
-- 2. Atomic Revocation of approvals made strictly before September 29, 2026
BEGIN;

-- Create temporary table of target application IDs
CREATE TEMP TABLE tmp_pre_sept29_approved_apps AS
WITH app_approvals AS (
  SELECT 
    a.id,
    a.status AS current_status,
    a.applicant_id,
    COALESCE(
      (
        SELECT MAX(h.created_at) 
        FROM public.application_status_history h 
        WHERE h.application_id = a.id AND h.to_status = 'approved'
      ),
      a.updated_at
    ) AS effective_approved_at
  FROM public.applications a
  WHERE a.status IN ('approved', 'enrolled')
)
SELECT id, current_status, applicant_id, effective_approved_at
FROM app_approvals
WHERE effective_approved_at < '2026-09-29T00:00:00Z';

-- Insert status history for each revoked application
INSERT INTO public.application_status_history (
  application_id,
  from_status,
  to_status,
  changed_by,
  internal_reason,
  applicant_message,
  created_at
)
SELECT 
  id,
  current_status::public.application_status,
  'under_review'::public.application_status,
  applicant_id, -- or board/system reference
  'Reverted pre-September 29 batch approval by Board directive',
  'Your application is currently under active review by the scholarship board.',
  NOW()
FROM tmp_pre_sept29_approved_apps;

-- Update applications status back to under_review
UPDATE public.applications
SET 
  status = 'under_review',
  updated_at = NOW()
WHERE id IN (SELECT id FROM tmp_pre_sept29_approved_apps);

-- Insert consolidated audit event
INSERT INTO public.audit_events (
  actor_id,
  action,
  object_type,
  outcome,
  metadata
)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'application.pre_sept29_approvals_revoked',
  'application_batch',
  'success',
  jsonb_build_object(
    'revoked_count', (SELECT COUNT(*) FROM tmp_pre_sept29_approved_apps),
    'cutoff_date', '2026-09-29T00:00:00Z',
    'reverted_to', 'under_review'
  );

DROP TABLE tmp_pre_sept29_approved_apps;

COMMIT;
```

- [ ] **Step 3: Verification check**
Verify that all remaining applications with status `'approved'` or `'enrolled'` have approval timestamps on or after September 29, 2026.

---

### Task 2: Remove Bulk Revoke Button from Admin Portal

**Files:**
- Modify: `src/routes/admin.applicants.index.tsx`

- [ ] **Step 1: Remove "Revoke Enrolled" button from top action bar**
Remove lines 1014–1026:
```tsx
// REMOVE:
<Button
  variant="outline"
  className="border-red-400/60 text-red-700 hover:bg-red-50 hover:text-red-800 font-bold shadow-xs h-10"
  onClick={() => {
    setBulkRevokeFeedback(null);
    setBulkRevokeProgress(null);
    setBulkRevokeModalOpen(true);
  }}
  disabled={stats.approved === 0}
>
  <RotateCcw className="mr-1.5 h-4 w-4 text-red-500" />
  Revoke Enrolled
</Button>
```

- [ ] **Step 2: Remove the `bulkRevokeModalOpen` dialog and obsolete state**
Remove the bulk revoke dialog (`<Dialog open={bulkRevokeModalOpen} ...>`) and clean up `handleBulkRevoke`, `bulkRevoking`, `bulkRevokeReason`, and `bulkRevokeModalOpen` state hooks.

- [ ] **Step 3: Verify admin applicants screen builds without error**
Run `npm run build` to verify clean compilation.

---

### Task 3: Backend Attendance Confirmation Server Function

**Files:**
- Modify: `src/lib/admin/admin-actions.ts`
- Modify: `src/lib/supabase/applications.ts`
- Modify: `src/lib/fsf.ts`

- [ ] **Step 1: Extend `Application["personal"]` type in `src/lib/fsf.ts`**
Add fields:
```ts
physicalAttendanceAcknowledged?: boolean;
resumptionAttendanceConfirmed?: boolean;
resumptionAttendanceConfirmedAt?: string;
```

- [ ] **Step 2: Implement `confirmResumptionAttendanceServerFn` in `src/lib/admin/admin-actions.ts`**
```ts
const confirmAttendanceSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
});

export const confirmResumptionAttendanceServerFn = createServerFn({ method: "POST" })
  .validator(confirmAttendanceSchema)
  .handler(async ({ data }) => {
    const { user, adminClient } = await verifyUserAndGetAdminClient(data.accessToken);

    const { data: app, error: appErr } = await adminClient
      .from("applications")
      .select("id, applicant_id, status, personal")
      .eq("id", data.applicationId)
      .maybeSingle();

    if (appErr || !app) {
      throw new Error("Application record not found.");
    }

    if (app.applicant_id !== user.id) {
      throw new Error("You are not authorized to confirm attendance for this application.");
    }

    const currentStatus = String(app.status).toLowerCase();
    if (currentStatus !== "approved" && currentStatus !== "enrolled") {
      throw new Error("Only approved scholarship candidates can confirm attendance.");
    }

    const now = new Date().toISOString();
    const existingPersonal = (app.personal as Record<string, unknown>) || {};
    const updatedPersonal = {
      ...existingPersonal,
      physicalAttendanceAcknowledged: true,
      resumptionAttendanceConfirmed: true,
      resumptionAttendanceConfirmedAt: now,
      resumptionTargetDate: "2027-10-15",
    };

    const { error: updateErr } = await adminClient
      .from("applications")
      .update({
        personal: updatedPersonal,
        updated_at: now,
      })
      .eq("id", app.id);

    if (updateErr) {
      throw new Error("Failed to record attendance confirmation: " + updateErr.message);
    }

    await adminClient.from("audit_events").insert({
      actor_id: user.id,
      action: "application.resumption_attendance_confirmed",
      object_type: "application",
      object_id: app.id,
      outcome: "success",
      metadata: { confirmed_at: now, location: "Aba Story Center", deadline: "2027-10-15" },
    });

    return { success: true, confirmedAt: now };
  });
```

- [ ] **Step 3: Export helper `confirmApplicantAttendance` in `src/lib/supabase/applications.ts`**
Calls `confirmResumptionAttendanceServerFn` with the current user's session token.

---

### Task 4: Candidate Portal Resumption Banner & "I Am Coming" Interactive RSVP

**Files:**
- Modify: `src/routes/portal.tsx`

- [ ] **Step 1: Add Resumption Callout Component in `portal.tsx`**
For applicants whose status is `Approved` or `Enrolled`:
Display a styled callout card directly below the welcome header:
- **Badge:** Official Resumption Notice & Physical Onboarding
- **Title:** Resumption at Story Center, Aba — Deadline: Thursday, October 15, 2027
- **Ethos & Requirements Details:**
  1. Full physical on-ground schooling at the **Story Center in Aba, Abia State**.
  2. The scholarship is powered and facilitated in partnership with our Christian church ministry; all admitted scholars are expected to actively participate in church fellowship and community activities.
- **Interactive Action:**
  - If `personal.resumptionAttendanceConfirmed` is false:
    - Button: **`[ I Confirm I Am Coming / Accept Invitation ]`**
    - Clicking displays a confirmation dialog summarizing the physical commitment, then executes `confirmApplicantAttendance`.
    - Shows success toast: *"Your attendance has been recorded! We look forward to receiving you in Aba."*
  - If already confirmed:
    - Displays a prominent green verification banner:
      **✓ Physical Attendance Confirmed: You have confirmed your arrival for Thursday, October 15, 2027.**

- [ ] **Step 2: Test candidate interaction state changes**
Verify that upon confirmation, the button seamlessly switches to the confirmed state and updates local store.

---

### Task 5: Admin Portal Visibility for Expected Headcount

**Files:**
- Modify: `src/routes/admin.applicants.index.tsx`

- [ ] **Step 1: Display Attendance Status in Applicants Table**
In the table rows for approved students, show a badge:
- `Confirmed Attending` (Green) if `personal.resumptionAttendanceConfirmed` is true.
- `Pending RSVP` (Amber) if still unconfirmed.

- [ ] **Step 2: Add quick filter or metric counter**
Add count in dashboard metrics or filter pills:
- e.g. "Approved (Total)" / "Confirmed Attending" to give instant count visibility of arriving students.

---

### Task 6: Pre-configured Resumption Email & Message in Communications Dashboard

**Files:**
- Modify: `src/routes/admin.communications.tsx`

- [ ] **Step 1: Add "Approved Applicants (Resumption Notice)" audience preset**
When selected from the Audience dropdown:
Pre-populates:
- **Subject:** `Official Resumption Notice & Physical Onboarding Confirmation — The Free School Foundation`
- **Body:**
```text
Dear Scholar,

Following the official approval of your application for The Free School Foundation Scholarship, we are pleased to welcome you to the academic session.

Please read the following important operational details carefully regarding how the programme runs:

1. Physical On-Ground Resumption (Story Center, Aba):
This programme requires full physical presence. All admitted students must relocate and be on-ground for academic and practical work at our Story Center in Aba, Abia State.

2. Resumption Deadline:
The final deadline for physical arrival and registration at the Aba Story Center is Thursday, October 15, 2027.

3. Foundation & Church Partnership Ethos:
This scholarship is fully funded and facilitated in partnership with our Christian church ministry. As a sponsored scholar of the Foundation, all admitted students are expected to actively participate in the fellowship, values, and community activities of the church organization powering this scholarship.

4. MANDATORY ACTION — Confirm Your Attendance:
To enable us to prepare your materials, seat allocation, and reception logistics, you must indicate whether you will be coming.

👉 Please log in to your scholarship portal immediately and click "Confirm Attendance / I Am Coming" to secure your spot.

Portal Login Link: https://thefreeschoolfoundation.com.ng/portal

If you have any logistical questions or require travel guidance to Aba, please reply directly through your portal message center or contact our support team.

Warm regards,
The Admissions & Onboarding Directorate
The Free School Foundation
```
- Priority: `High`

- [ ] **Step 2: Test and verify dispatch flow**
Verify that clicking Send delivers both the high-priority portal message and triggers Resend batch email delivery.

---

### Task 7: End-to-End Build and Safety Validation

**Files:**
- Verification: Build, typecheck, and test runner.

- [ ] **Step 1: Run production build check**
Run `npm run build` to confirm zero TypeScript, routing, or SSR errors.

- [ ] **Step 2: Verify git status and ensure no unintended changes**
Confirm no published commits are rewritten (Lovable integrity).
