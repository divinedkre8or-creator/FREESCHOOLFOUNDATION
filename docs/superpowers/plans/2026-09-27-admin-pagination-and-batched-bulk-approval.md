# Admin Dataset Full-Scale Pagination & Batched Bulk Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 1,000-user ceiling on the admin portal by implementing server-side loop fetching for full datasets, live KPI database counts, responsive table pagination controls, and 100-item batched bulk approvals to safely handle 900+ candidates without HTTP URL length overflows.

**Architecture:** 
- In `src/lib/admin/admin-actions.ts`, refactor `getRegisteredUsersServerFn` and `getAdminApplicationsServerFn` to iterate through all auth pages and PostgREST table ranges (`.range(from, to)` in 1,000-row blocks) until all records are retrieved.
- In `bulkApproveApplicationsServerFn`, slice incoming application IDs into chunks of 100 and execute status updates, status history inserts, and portal message dispatches sequentially per batch.
- In `src/routes/admin.applicants.index.tsx`, add interactive pagination toolbars (`50`, `100`, `250`, `All` per page) for both the Applications and Registered Users tabs while displaying live database summary metrics.

**Tech Stack:** TypeScript, React, TanStack Router / TanStack Start Server Functions, Supabase Auth & PostgreSQL, Tailwind CSS, Lucide React, Vitest.

---

### Task 1: Server-Side Full Dataset Fetching in `admin-actions.ts`

**Files:**
- Modify: `src/lib/admin/admin-actions.ts`
- Test: Verification script / scratch test

- [ ] **Step 1: Refactor `getRegisteredUsersServerFn` to iterate through all auth pages and table ranges**

Update `getRegisteredUsersServerFn` to:
1. Loop over `adminClient.auth.admin.listUsers({ page, perPage: 1000 })` until `users.length < 1000`.
2. Fetch `applications` in chunks of 1000 using `.range(from, to)` until exhausted.
3. Fetch `profiles` in chunks of 1000 using `.range(from, to)` until exhausted.
4. Merge into `RegisteredUser[]` and return.

- [ ] **Step 2: Refactor `getAdminApplicationsServerFn` to range-query all application rows**

Update `getAdminApplicationsServerFn` to:
1. Query applications in chunks of 1000 using `.range(from, to)` until no more rows return.
2. Return the complete aggregated array of application records.

- [ ] **Step 3: Verify server functions return complete 1,843+ dataset**

Run verification command to confirm total fetched users matches the database count.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/admin-actions.ts
git commit -m "feat(admin): implement server-side chunked fetching for full applicant and user datasets"
```

---

### Task 2: Chunked Batched Bulk Approval in `admin-actions.ts`

**Files:**
- Modify: `src/lib/admin/admin-actions.ts`

- [ ] **Step 1: Refactor `bulkApproveApplicationsServerFn` with safe chunking (100 per batch)**

Update `bulkApproveApplicationsServerFn` to:
1. Slice `data.applicationIds` into chunks of 100 (`const BATCH_SIZE = 100`).
2. For each chunk:
   - Query eligible applications in the chunk using `.in("id", chunkIds)`.
   - Update statuses to `approved` for eligible IDs in the chunk.
   - Insert status history rows for the chunk.
   - Insert portal messages and recipient records for the chunk.
3. Consolidate and insert a single audit event.
4. Return total approved count and total requested.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/admin-actions.ts
git commit -m "feat(admin): chunk bulk approvals into batches of 100 to prevent URL overflow"
```

---

### Task 3: Interactive Table Pagination & KPI Metrics in `admin.applicants.index.tsx`

**Files:**
- Modify: `src/routes/admin.applicants.index.tsx`

- [ ] **Step 1: Add pagination state and handlers**

Add state for:
- Applications tab: `appPage`, `appPageSize` (default: 50)
- Registered Users tab: `regPage`, `regPageSize` (default: 50)
- Reset page to 1 on filter or search query change.

- [ ] **Step 2: Add pagination toolbar component and controls**

Render pagination controls below both tables:
- "Showing X–Y of Z entries"
- Page selector buttons (`First`, `Previous`, `Next`, `Last`, and numbered buttons)
- Page size selector (`50`, `100`, `250`, `All`)

- [ ] **Step 3: Update bulk approval modal with batch progress feedback**

Ensure bulk approval modal shows clear progress state and feedback when processing large applicant groups.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin.applicants.index.tsx
git commit -m "feat(admin): add interactive table pagination and real-time database KPI counters"
```

---

### Task 4: End-to-End Verification & Typecheck

**Files:**
- Entire project

- [ ] **Step 1: Run TypeScript check**

Run: `bun run build` or `tsc --noEmit` to ensure no lint or type regressions.

- [ ] **Step 2: Commit final changes**

```bash
git commit -m "chore(admin): finalize full dataset pagination and batched bulk approval"
```
