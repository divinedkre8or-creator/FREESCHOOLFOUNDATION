# Registered Users Email Reminder Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Foundation administrators to target and send email reminders to registered users who have not yet submitted a scholarship application.

**Architecture:** Add a secure TanStack Start server function that verifies staff communications permission, retrieves target user emails from Supabase Auth + Profiles, generates customized reminder emails with direct `/apply` action CTAs, and delivers via Resend Batch API with idempotency protection. Wire up audience targeting in the Communications Center and add a direct reminder action in the Registered Users table.

**Tech Stack:** TypeScript, React, TanStack Start / Router, Supabase, Resend Batch API, Tailwind CSS, Lucide Icons, Vitest.

---

### Task 1: Email Templates & Unit Tests

**Files:**
- Modify: `src/lib/email/templates.ts`
- Modify: `src/lib/email/templates.test.ts`

- [ ] **Step 1: Write failing unit test for reminder email template**
- [ ] **Step 2: Run `vitest run` to verify failure**
- [ ] **Step 3: Update `src/lib/email/templates.ts` with `"reminder"` event support and customizable action CTA URL & button text**
- [ ] **Step 4: Run `vitest run` to verify tests pass**

---

### Task 2: Server-Side Dispatch Function (`sendRegisteredUsersEmailBatch`)

**Files:**
- Modify: `src/lib/email/platform-email.ts`

- [ ] **Step 1: Define validation schema `registeredUsersEmailSchema` (accessToken, userIds, subject, body, actionUrl, actionText)**
- [ ] **Step 2: Implement `sendRegisteredUsersEmailBatch` server function with permission checks, user resolution, and Resend batch dispatch**
- [ ] **Step 3: Export client-side helper `sendRegisteredUsersEmail`**

---

### Task 3: Admin Communications Center Integration

**Files:**
- Modify: `src/routes/admin.communications.tsx`

- [ ] **Step 1: Load registered users alongside applications in `CommunicationsPage`**
- [ ] **Step 2: Add audience options for "Registered Users (Not Applied Yet)" and "Registered Users (Draft in Progress)"**
- [ ] **Step 3: Compute recipient counts and provide pre-filled reminder template text when unapplied audience is selected**
- [ ] **Step 4: Connect form submission to call `sendRegisteredUsersEmail` when registered user audience is chosen**

---

### Task 4: Registered Users Table Direct Reminder Action & Modal

**Files:**
- Modify: `src/routes/admin.applicants.index.tsx`

- [ ] **Step 1: Add row checkboxes and bulk selection state to Registered Users table**
- [ ] **Step 2: Add action bar with "Remind Unapplied (N)" and "Email Selected" buttons**
- [ ] **Step 3: Create an interactive modal allowing admins to customize subject/body before dispatching reminder**
- [ ] **Step 4: Connect modal submit to `sendRegisteredUsersEmail` and provide instant feedback**

---

### Task 5: Verification & Quality Assurance

- [ ] **Step 1: Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors**
- [ ] **Step 2: Run `npm test` (`vitest run`) to verify all automated test suites pass**
- [ ] **Step 3: Test admin communications workflow and verify clean visual design**
