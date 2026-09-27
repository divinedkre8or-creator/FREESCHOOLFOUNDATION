# Design Spec: Admin Dataset Full-Scale Pagination & Batched Bulk Approval

**Date:** 2026-09-27  
**Author:** Antigravity Engineering  
**Status:** Approved for Implementation  

---

## 1. Problem Statement & Context

1. **1,000 Record Ceiling on Admin Panel**:
   * The live database currently contains **1,843+ registered users and applications**.
   * In [src/lib/admin/admin-actions.ts](file:///c:/Users/Divine/Desktop/FREESCHOOLFOUNDATION/src/lib/admin/admin-actions.ts), `getRegisteredUsersServerFn` queries `adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })`, which stops after page 1 (1,000 users).
   * PostgREST queries on `.from("applications")` and `.from("profiles")` default to `max_rows: 1000` unless range-paginated.
   * As a result, the admin dashboard, applications table, and registered users table show a truncated dataset of 1,000 records instead of the true 1,843+.

2. **Bulk Approval Failure for 900+ Applicants**:
   * When administrators attempt to bulk approve large sets (e.g., 900 applicants), `bulkApproveApplicationsServerFn` places all 900 UUIDs in `.in("id", data.applicationIds)`.
   * PostgREST translates `.in()` into an HTTP GET URL parameter string of over 33,000 characters, exceeding web server/proxy URL size limits (8KB) and triggering `414 URI Too Long` / `502 Bad Gateway`.
   * Single-batch inserts of 900+ status histories and 900+ message recipient rows can also hit PostgreSQL parameter limits.

---

## 2. Goals & Success Criteria

- **Real Database Numbers**: Dashboard cards and header metrics must reflect 100% accurate database totals (1,843+ applicants) at all times.
- **Complete Dataset Retrieval**: Server actions must automatically iterate through auth pages and table ranges to retrieve all records without truncation.
- **Batched Bulk Actions**: Bulk approval must automatically chunk large arrays into safe batches of 100, preventing URL length overflows, database timeout errors, and gateway failures.
- **Responsive Table Pagination**: The admin tables must provide responsive page navigation (`50`, `100`, `250`, or `All` per page) with full search and filtering support.

---

## 3. Technical Architecture & Components

### A. Backend: Full Dataset Fetching (`src/lib/admin/admin-actions.ts`)

1. **`getRegisteredUsersServerFn`**:
   * **Auth User Paging**: Implement a `while` loop that calls `adminClient.auth.admin.listUsers({ page, perPage: 1000 })` incrementing `page` until `users.length < 1000`.
   * **Applications & Profiles Range Queries**: Fetch `applications` and `profiles` in 1,000-row chunks using `.range(from, to)` until exhausted.
   * Merge auth users, applications, and profiles into the full `RegisteredUser[]` array.

2. **`getAdminApplicationsServerFn`**:
   * Fetch applications with related tables (`programmes`, `application_documents`, `application_status_history`, `internal_notes`, `message_recipients`) using loop-based `.range(from, to)` with 1,000-row increments until all applications are loaded.

3. **Accurate KPI Metric Counts**:
   * Provide direct count queries using `{ count: "exact", head: true }` so summary cards never fall out of sync with raw database totals.

---

### B. Backend: Batched Bulk Approval (`bulkApproveApplicationsServerFn`)

1. **Chunking Mechanism**:
   * Slices `data.applicationIds` into chunks of `BATCH_SIZE = 100`.
2. **Per-Batch Processing Loop**:
   * For each chunk of 100 application IDs:
     1. **Fetch Eligible Applications**: `.from("applications").select("id, status, applicant_id, campaign_id").in("id", chunkIds)`.
     2. **Update Status**: `.from("applications").update({ status: "approved", updated_at: now }).in("id", eligibleChunkIds)`.
     3. **Insert Status History**: Insert history records for the current chunk.
     4. **Create In-Platform Portal Message & Recipients**: Insert message recipient records for eligible applicants in the chunk.
3. **Audit Event**:
   * Log a single consolidated audit event with total requested and total approved count.
4. **Resilience**:
   * Wrap each batch in error handling so one malformed record does not abort the entire batch pipeline.
   * Return `{ success: true, approvedCount: number, totalRequested: number }`.

---

### C. Frontend: Table Pagination & Progress UI (`src/routes/admin.applicants.index.tsx`)

1. **Pagination Controls Component**:
   * Integrated into both **Applications** and **Registered Users** tabs.
   * Controls:
     * Current page indicator (e.g., `Page 1 of 37 (Showing 1–50 of 1,843)`).
     * Navigation buttons: `First`, `Previous`, `Next`, `Last`.
     * Page size selector dropdown: `50`, `100`, `250`, `All`.
2. **Client-Side Slicing on Full Dataset**:
   * Filters and search queries (by name, phone, email, state, status, level, programme) filter the complete dataset first.
   * Pagination slices the filtered array for rendering.
3. **Bulk Approval Modal Enhancement**:
   * Displays batch progress when processing large candidate lists (e.g. `Approving applicants... (100/900)`).
   * Email toggle clearly indicates that in-platform portal notifications are delivered immediately, avoiding external email provider blocks.

---

## 4. Error Handling & Edge Cases

| Edge Case | Solution |
| :--- | :--- |
| Database contains > 5,000 records | Server loop automatically increments ranges until `data.length === 0`. |
| User selects 1,000+ candidates for bulk approval | Sliced into 100-item chunks; no single HTTP request exceeds 4KB query length. |
| Some selected candidates are already approved | Filtered out in eligible check per chunk; status and notifications only dispatch to eligible candidates. |
| Search filter active during pagination | Page resets to 1 whenever search query or filter dropdown changes. |

---

## 5. Implementation Plan Summary

1. Update [src/lib/admin/admin-actions.ts](file:///c:/Users/Divine/Desktop/FREESCHOOLFOUNDATION/src/lib/admin/admin-actions.ts):
   - Refactor `getRegisteredUsersServerFn` to paginate `listUsers` and range-query `applications` and `profiles`.
   - Refactor `getAdminApplicationsServerFn` to loop range-query applications.
   - Refactor `bulkApproveApplicationsServerFn` with 100-item chunking.
2. Update [src/routes/admin.applicants.index.tsx](file:///c:/Users/Divine/Desktop/FREESCHOOLFOUNDATION/src/routes/admin.applicants.index.tsx):
   - Add pagination state and controls for both tabs.
   - Connect full dataset counts and chunked bulk approval handling.
3. Verification & Testing:
   - Run type-check (`bun run check` or `tsc --noEmit`) and existing test suites.
   - Validate live query loading all 1,843+ records and test batched approval.
