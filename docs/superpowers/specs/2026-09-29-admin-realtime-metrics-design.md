# Real-time Admin Figures Performance Optimization Design

**Date:** 2026-09-29  
**Goal:** Reduce Admin Console overview metric loading time to under 1.5 seconds (< 250ms target) without functional tradeoffs.

---

## 1. Context & Problem Statement
Currently, the Admin Dashboard (`/admin`) fetches all full application dossiers and lists all registered auth users in memory over the client-server bridge. As application volume increases into thousands, this causes:
- Transfer of megabytes of nested relational data (notes, history, messages, documents) merely to compute summary count statistics.
- 3s to 10s+ loading latency and high database/network egress.

## 2. Architecture & Solution

### 2.1 Server Function: SQL Aggregation RPC
Instead of dumping all rows to memory, TanStack Start server function `getAdminDashboardMetricsServerFn` executes database-level aggregations directly in PostgreSQL:
1. **Total Registered Accounts**: Direct `COUNT(*)` from `auth.users` or `profiles`.
2. **Status Counts**: `COUNT(*)` grouped by `status` (Draft, Submitted, Under Review, Additional Documents Required, Shortlisted, Approved, Enrolled, Rejected).
3. **Programme & Level Breakdown**: `COUNT(*)` grouped by `programme_id` and `level`.
4. **Recent Activity**: Top 5 latest submissions with lightweight projection (`id`, `application_number`, `first_name`, `last_name`, `programme_name`, `status`, `submitted_at`).

### 2.2 Client-side Realtime Sync
- Subscribe to Supabase Realtime (`postgres_changes` on `applications` table).
- Automatically triggers a lightweight sub-100ms metrics re-fetch on insert or update, keeping the dashboard figures live without manual page reloads.

### 2.3 Two-Tier Data Projection
- `/admin/index.tsx` uses only `getAdminDashboardMetrics()`.
- `/admin/applicants/index.tsx` loads applicant lists when the admin explicitly navigates to the management console.

---

## 3. Interfaces & Data Contract

```typescript
export interface AdminDashboardMetrics {
  totalRegistered: number;
  totalSubmitted: number;
  underReviewCount: number;
  documentsRequiredCount: number;
  shortlistedCount: number;
  approvedCount: number;
  enrolledCount: number;
  rejectedCount: number;
  byProgramme: { id: string; name: string; count: number }[];
  byLevel: { level: string; count: number }[];
  recentSubmissions: {
    id: string;
    applicationNumber: string;
    applicantName: string;
    programmeName: string;
    status: string;
    submittedAt: string;
  }[];
}
```

---

## 4. Acceptance Criteria
- Overview dashboard figures load in < 1.5s (under 300ms typical).
- Live real-time updates reflect changes automatically.
- TypeScript check (`tsc --noEmit`) and build passes with 0 errors.
