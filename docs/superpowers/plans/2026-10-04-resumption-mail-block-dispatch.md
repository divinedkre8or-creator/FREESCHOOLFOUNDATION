# Resumption Mail Block Dispatch & Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a durable Resumption Mail Block Dispatch & Monitoring system with automatic block cancellation, centralized monitoring in Communications, inline dispatch on applicant review, and status indicators in the applicant directory.

**Architecture:** Store `resumptionEmailSent`, `resumptionEmailSentAt`, and `resumptionEmailBatchId` inside `applications.personal` JSONB. Expose a secure server function that sends Resend Pro batch emails, dispatches high-priority in-portal messages, updates applicant records, and logs audit events. Partition approved applicants into "Pending Block" and "Delivered Block", automatically clearing the pending block when sent.

**Tech Stack:** TanStack Start, React 19, TypeScript, Supabase PostgreSQL, Resend Pro API, Tailwind CSS, Lucide icons.

---

### Task 1: Type Definitions and Data Mapping

**Files:**
- Modify: `src/lib/fsf.ts:200-215`
- Modify: `src/lib/supabase/applications.ts:800-830`

- [ ] **Step 1: Update Application type in `src/lib/fsf.ts`**
Add `resumptionEmailSent`, `resumptionEmailSentAt`, and `resumptionEmailBatchId` to `Application["personal"]`:
```typescript
    stateOfOrigin: string;
    religion?: string;
    physicalAttendanceAcknowledged?: boolean;
    churchMinistryEthosAcknowledged?: boolean;
    scholarshipCommitmentAcknowledged?: boolean;
    resumptionEmailSent?: boolean;
    resumptionEmailSentAt?: string;
    resumptionEmailBatchId?: string;
    resumptionAttendanceConfirmed?: boolean;
    resumptionAttendanceConfirmedAt?: string;
    resumptionTargetDate?: string;
```

- [ ] **Step 2: Ensure `mapApplication` preserves resumption email tracking in `src/lib/supabase/applications.ts`**
In `mapApplication(data: ApplicationRow)`:
Ensure `personal` passes through all JSONB keys so that `resumptionEmailSent`, `resumptionEmailSentAt`, and `resumptionEmailBatchId` are accessible across the application.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/lib/fsf.ts src/lib/supabase/applications.ts
git commit -m "feat(types): add resumption email tracking fields to Application schema"
```

---

### Task 2: Backend Server Function for Resumption Mail Dispatch

**Files:**
- Modify: `src/lib/admin/admin-actions.ts:1600-1667`
- Modify: `src/lib/supabase/applications.ts:890-904`

- [ ] **Step 1: Add `dispatchResumptionEmailBatchServerFn` to `src/lib/admin/admin-actions.ts`**
Implement the server function:
1. Validator: `applicationIds` (uuid array, min 1), `customSubject` (optional string), `customBody` (optional string).
2. Authenticate staff user via `verifyStaffAndGetClients(data.accessToken)`.
3. Fetch target applications and verify status is `approved` or `enrolled`.
4. Construct email batch for Resend Pro using official resumption copy.
5. Create portal messages in `public.messages` and `public.message_recipients`.
6. Update `applications` table setting `personal = personal || jsonb_build_object('resumptionEmailSent', true, 'resumptionEmailSentAt', now, 'resumptionEmailBatchId', batchId)`.
7. Insert audit event into `public.audit_events`.
8. Return `{ success: true, count: N, batchId }`.

- [ ] **Step 2: Export client wrapper in `src/lib/supabase/applications.ts`**
Export `dispatchResumptionEmailBatch`:
```typescript
export async function dispatchResumptionEmailBatch(input: {
  applicationIds: string[];
  customSubject?: string;
  customBody?: string;
}): Promise<{ success: boolean; count: number; batchId: string }>
```

- [ ] **Step 3: Test compilation**
Run: `npm run build`
Expected: Clean build.

- [ ] **Step 4: Commit**
```bash
git add src/lib/admin/admin-actions.ts src/lib/supabase/applications.ts
git commit -m "feat(api): implement durable resumption email batch dispatch server function"
```

---

### Task 3: Centralized Resumption Dispatch & Block Manager in Communications Hub

**Files:**
- Modify: `src/routes/admin.communications.tsx:1-350`

- [ ] **Step 1: Implement Dynamic Block Partitioning**
Calculate:
- `pendingResumptionApps`: approved/enrolled applications where `!app.personal?.resumptionEmailSent`.
- `deliveredResumptionApps`: approved/enrolled applications where `Boolean(app.personal?.resumptionEmailSent)`.
- `rsvpConfirmedApps`: delivered applications where `Boolean(app.personal?.resumptionAttendanceConfirmed)`.

- [ ] **Step 2: Build the "Resumption Notice & Cohort Dispatch" Hero Card**
Place at the top of `/admin/communications`:
- Metric Badges:
  - Pending Block: `X Awaiting Resumption Notice`
  - Delivered Block: `Y Notices Delivered`
  - RSVP Confirmed: `Z Confirmed Coming (Aba Story Center)`
- Expandable Roster of Pending Scholars (Name, Application #, Programme, Date).
- Action Button: `🚀 Dispatch Resumption Notice to Current Block (X Scholars)`.
- Confirmation Dialog explaining the dispatch and block cancellation.
- Clear Feedback Banner on success or error.

- [ ] **Step 3: Update Audience Selector**
Add direct audience filters:
- `Approved (Pending Resumption Mail) — X scholars`
- `Approved (Resumption Mail Delivered) — Y scholars`

- [ ] **Step 4: Test build and visual structure**
Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**
```bash
git add src/routes/admin.communications.tsx
git commit -m "feat(communications): add resumption cohort dispatch hub and block manager"
```

---

### Task 4: Inline Approval Dispatch & Status Indicators in Applicant Review Dossier

**Files:**
- Modify: `src/routes/admin.applicants.$applicationId.tsx:350-480`

- [ ] **Step 1: Add Resumption Mail Status Indicator to Applicant Profile**
In the header / status review card of `/admin/applicants/$applicationId`:
- If `status === "Approved"` or `"Enrolled"`:
  - If `app.personal?.resumptionEmailSent`:
    - Display green badge: `✓ Resumption Notice Delivered` with date.
    - Button: `🔄 Resend Resumption Notice`.
  - If `!app.personal?.resumptionEmailSent`:
    - Display amber badge: `⏳ Resumption Notice Pending`.
    - Button: `✉️ Send Resumption Notice & Confirmation`.

- [ ] **Step 2: Add Confirmation Modal & Handler**
When clicking `Send Resumption Notice & Confirmation`:
- Dispatches resumption email directly for this application.
- Updates local state so the badge immediately flips to `✓ Delivered`.
- Shows feedback toast.

- [ ] **Step 3: Add Auto-Send Toggle on Approval Status Change**
When changing status to "Approved", include a toggle:
- `[x] Automatically dispatch resumption email to candidate` (checked by default).

- [ ] **Step 4: Test build**
Run: `npm run build`
Expected: Clean build.

- [ ] **Step 5: Commit**
```bash
git add src/routes/admin.applicants.$applicationId.tsx
git commit -m "feat(admin): add inline resumption email dispatch and delivery badge to applicant review"
```

---

### Task 5: Applicant Directory Mail Status Badge and Filtering

**Files:**
- Modify: `src/routes/admin.applicants.index.tsx:1-500`

- [ ] **Step 1: Add Resumption Mail Filter Dropdown**
In the filters toolbar of `/admin/applicants`:
- Add filter: `Resumption Mail: All | Pending Notice | Delivered`.

- [ ] **Step 2: Add Mail Status Indicator in Table Rows**
For approved/enrolled candidates in the table:
- Compact badge or icon:
  - Green mail check: `Resumption Sent`
  - Amber clock mail: `Pending Mail`

- [ ] **Step 3: Verification & Full Production Build**
Run: `npm run build`
Expected: Build passes with 0 warnings or errors.

- [ ] **Step 4: Commit**
```bash
git add src/routes/admin.applicants.index.tsx
git commit -m "feat(admin): add resumption mail status indicator and filter in applicant directory"
```

---

### Task 6: Execution Tracker Update & Final Verification

**Files:**
- Modify: `TASK_TRACKER.md`

- [ ] **Step 1: Update `TASK_TRACKER.md`**
Record P5 communications and P4 admin operations updates with verified evidence.

- [ ] **Step 2: Commit**
```bash
git add TASK_TRACKER.md
git commit -m "chore(tracker): record resumption mail block dispatch and monitoring completion"
```
