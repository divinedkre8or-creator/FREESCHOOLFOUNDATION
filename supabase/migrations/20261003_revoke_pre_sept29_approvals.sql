-- ==============================================================================
-- Migration: 20261003_revoke_pre_sept29_approvals.sql
-- Purpose: Safely revoke approvals made before September 29, 2026
--          Preserves all approvals made on or after September 29, 2026
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: Dry-Run Inspection Query (Run this first to inspect affected applications)
-- ------------------------------------------------------------------------------
-- WITH app_approvals AS (
--   SELECT 
--     a.id,
--     a.application_number,
--     a.status,
--     a.personal->>'firstName' AS first_name,
--     a.personal->>'lastName' AS last_name,
--     a.updated_at,
--     COALESCE(
--       (
--         SELECT MAX(h.created_at) 
--         FROM public.application_status_history h 
--         WHERE h.application_id = a.id AND h.to_status = 'approved'
--       ),
--       a.updated_at
--     ) AS effective_approved_at
--   FROM public.applications a
--   WHERE a.status IN ('approved', 'enrolled')
-- )
-- SELECT 
--   COUNT(*) FILTER (WHERE effective_approved_at < '2026-09-29T00:00:00Z') AS to_be_revoked_count,
--   COUNT(*) FILTER (WHERE effective_approved_at >= '2026-09-29T00:00:00Z') AS preserved_approved_count,
--   COUNT(*) AS total_currently_approved
-- FROM app_approvals;


-- ------------------------------------------------------------------------------
-- STEP 2: Atomic Revocation Transaction
-- ------------------------------------------------------------------------------
BEGIN;

-- Explicitly ensure RLS is active on referenced tables (satisfies Supabase linter)
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 1. Insert audit history record for each reverted application
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
),
target_apps AS (
  SELECT id, current_status, applicant_id
  FROM app_approvals
  WHERE effective_approved_at < '2026-09-29T00:00:00Z'
)
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
  applicant_id,
  'Reverted pre-September 29 batch approval by Board directive',
  'Your application status is currently under active review by the scholarship board.',
  NOW()
FROM target_apps;

-- 2. Update application status back to under_review
WITH app_approvals AS (
  SELECT 
    a.id,
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
UPDATE public.applications
SET 
  status = 'under_review',
  updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM app_approvals 
  WHERE effective_approved_at < '2026-09-29T00:00:00Z'
);

-- 3. Record consolidated audit event
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
    'cutoff_date', '2026-09-29T00:00:00Z',
    'reverted_to', 'under_review',
    'executed_at', NOW()
  );

COMMIT;

-- 4. Verification Query
SELECT 
  (SELECT COUNT(*) FROM public.applications WHERE status = 'approved') AS remaining_approved_count,
  (SELECT COUNT(*) FROM public.applications WHERE status = 'under_review') AS under_review_count;
