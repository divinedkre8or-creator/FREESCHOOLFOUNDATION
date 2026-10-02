-- ==============================================================================
-- THE FREE SCHOOL FOUNDATION — ADMIN & SCRUTINY WORKFLOW SQL PATCH
-- Paste and Run this in your Supabase Project SQL Editor (https://supabase.com/dashboard/project/amzcvuknjtpsrktkdhcf/sql)
-- ==============================================================================

BEGIN;

-- 1. Ensure Super Admin access for your official account
INSERT INTO public.staff_bootstrap_allowlist (email)
VALUES ('officialnwachukwudivine@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 1B. Deactivate removed engineering programmes (keeping only Business Admin, Mass Comm, and Computer Science active)
UPDATE public.programmes
SET active = false
WHERE name IN ('Electrical Engineering', 'Computer Engineering');

-- 2. Function: List All Registered Users (Joins auth.users, profiles, and applications)
CREATE OR REPLACE FUNCTION public.list_registered_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  email_confirmed boolean,
  has_application boolean,
  application_id uuid,
  application_number text,
  application_status text,
  application_level text,
  programme_name text,
  registered_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    account.id AS user_id,
    account.email::text,
    COALESCE(profile.first_name, (app.personal->>'firstName')) AS first_name,
    COALESCE(profile.last_name, (app.personal->>'lastName')) AS last_name,
    COALESCE(profile.phone, (app.personal->>'phone')) AS phone,
    (account.email_confirmed_at IS NOT NULL) AS email_confirmed,
    (app.id IS NOT NULL) AS has_application,
    app.id AS application_id,
    app.application_number,
    COALESCE(app.status::text, 'registered_only') AS application_status,
    app.level::text AS application_level,
    prog.name AS programme_name,
    account.created_at AS registered_at,
    account.last_sign_in_at
  FROM auth.users account
  LEFT JOIN public.profiles profile ON profile.user_id = account.id
  LEFT JOIN public.applications app ON app.applicant_id = account.id
  LEFT JOIN public.programmes prog ON prog.id = app.programme_id
  ORDER BY account.created_at DESC;
$$;

-- 3. Function: Verify or Flag Application Document
CREATE OR REPLACE FUNCTION public.verify_application_document(
  target_application_id uuid,
  target_document_id uuid,
  target_scan_status text,
  verification_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  doc_name text;
BEGIN
  IF NOT (
    public.has_staff_permission('review_applications', null)
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.role = 'super_admin' AND sp.active
    )
  ) THEN
    RAISE EXCEPTION 'staff_permission_required' USING errcode = '42501';
  END IF;

  IF target_scan_status NOT IN ('clean', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'invalid_scan_status';
  END IF;

  SELECT display_name INTO doc_name
  FROM public.application_documents
  WHERE id = target_document_id AND application_id = target_application_id;

  IF doc_name IS NULL THEN
    RAISE EXCEPTION 'document_not_found';
  END IF;

  UPDATE public.application_documents
  SET scan_status = target_scan_status::public.scan_status
  WHERE id = target_document_id AND application_id = target_application_id;

  INSERT INTO public.internal_notes (application_id, author_id, body)
  VALUES (
    target_application_id,
    auth.uid(),
    COALESCE(verification_note, 'Document "' || doc_name || '" marked as ' || UPPER(target_scan_status) || ' by staff reviewer.')
  );

  INSERT INTO public.audit_events (actor_id, action, object_type, object_id, outcome, metadata)
  VALUES (
    auth.uid(),
    'document.verification_updated',
    'application_document',
    target_document_id::text,
    'success',
    jsonb_build_object(
      'application_id', target_application_id,
      'document_id', target_document_id,
      'new_status', target_scan_status
    )
  );
END;
$$;

-- 4. Function: Register Initial Application Document (Draft stage)
CREATE OR REPLACE FUNCTION public.register_application_document(
  target_application_id uuid,
  target_document_type text,
  target_display_name text,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.applications application
    WHERE application.id = target_application_id
      AND application.applicant_id = (SELECT auth.uid())
      AND application.status = 'draft'
  ) THEN
    RAISE EXCEPTION 'draft_application_required' USING errcode = '42501';
  END IF;

  IF target_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp')
     OR target_size_bytes NOT BETWEEN 1 AND 10485760
     OR target_storage_path NOT LIKE (SELECT auth.uid())::text || '/' || target_application_id::text || '/%'
     OR char_length(trim(target_document_type)) NOT BETWEEN 1 AND 120
     OR char_length(trim(target_display_name)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'invalid_document_metadata' USING errcode = '22023';
  END IF;

  INSERT INTO public.application_documents(
    application_id, document_type, display_name, storage_path, mime_type,
    size_bytes, uploaded_at, scan_status
  ) VALUES (
    target_application_id, trim(target_document_type), trim(target_display_name),
    target_storage_path, target_mime_type, target_size_bytes, now(), 'pending'
  ) RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

-- 5. Function: Complete Requested Document Upload
CREATE OR REPLACE FUNCTION public.complete_requested_document_upload(
  target_document_id uuid,
  target_application_id uuid,
  target_display_name text,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF target_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp')
     OR target_size_bytes NOT BETWEEN 1 AND 10485760
     OR target_storage_path NOT LIKE (SELECT auth.uid())::text || '/' || target_application_id::text || '/%'
     OR char_length(trim(target_display_name)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'invalid_document_metadata' USING errcode = '22023';
  END IF;

  UPDATE public.application_documents document
  SET display_name = trim(target_display_name),
      storage_path = target_storage_path,
      mime_type = target_mime_type,
      size_bytes = target_size_bytes,
      uploaded_at = now(),
      scan_status = 'pending'
  FROM public.applications application
  WHERE document.id = target_document_id
    AND document.application_id = target_application_id
    AND document.requested_at IS NOT NULL
    AND application.id = document.application_id
    AND application.applicant_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_request_not_found' USING errcode = 'P0002';
  END IF;
END;
$$;

-- 5B. Function: Request Application Document (With super admin and staff permission checks)
CREATE OR REPLACE FUNCTION public.request_application_document(
  target_application_id uuid,
  requested_document_type text
)
RETURNS public.application_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_campaign_id uuid;
  created_document public.application_documents;
BEGIN
  IF char_length(trim(requested_document_type)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'invalid_document_type' USING errcode = '22023';
  END IF;

  SELECT application.campaign_id INTO target_campaign_id
  FROM public.applications application WHERE application.id = target_application_id;

  IF target_campaign_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT (
    public.has_staff_permission('request_documents', target_campaign_id)
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.role = 'super_admin' AND sp.active
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.email = 'officialnwachukwudivine@gmail.com' OR u.email LIKE '%@thefreeschoolfoundation.com.ng')
    )
  ) THEN
    RAISE EXCEPTION 'staff_permission_required' USING errcode = '42501';
  END IF;

  INSERT INTO public.application_documents(
    application_id, requested_by, document_type, display_name, requested_at, scan_status
  )
  VALUES (
    target_application_id, (SELECT auth.uid()), trim(requested_document_type), trim(requested_document_type), now(), 'pending'
  )
  RETURNING * INTO created_document;

  UPDATE public.applications
  SET status = 'additional_documents_required',
      updated_at = now()
  WHERE id = target_application_id;

  INSERT INTO public.audit_events(actor_id, action, object_type, object_id, outcome, metadata)
  VALUES (
    (SELECT auth.uid()),
    'application.document_requested',
    'application',
    target_application_id::text,
    'success',
    jsonb_build_object('document_type', trim(requested_document_type))
  );

  RETURN created_document;
END;
$$;

-- 6. High-Performance Dashboard Metrics Aggregation RPC
--    Uses a SINGLE table scan with conditional aggregation instead of 10+ separate COUNT(*) subqueries.
--    This reduces Disk IO reads by ~80%, critical when Supabase IO budget is constrained.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  metrics_result json;
  recent_rows json;
  prog_rows json;
  level_rows json;
  -- Single-scan aggregation variables
  v_total_applications int;
  v_total_submitted int;
  v_draft_count int;
  v_under_review_count int;
  v_documents_required_count int;
  v_shortlisted_count int;
  v_approved_count int;
  v_enrolled_count int;
  v_rejected_count int;
  v_total_registered int;
BEGIN
  -- Auth check: allow service_role, active staff, or foundation super admins
  IF NOT (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.active
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.email = 'officialnwachukwudivine@gmail.com' OR u.email LIKE '%@thefreeschoolfoundation.com.ng')
    )
  ) THEN
    RAISE EXCEPTION 'staff_permission_required' USING errcode = '42501';
  END IF;

  -- === SINGLE SCAN: compute ALL status counts in one pass ===
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status != 'draft')::int,
    COUNT(*) FILTER (WHERE status = 'draft')::int,
    COUNT(*) FILTER (WHERE status IN ('under_review', 'submitted'))::int,
    COUNT(*) FILTER (WHERE status = 'additional_documents_required')::int,
    COUNT(*) FILTER (WHERE status = 'shortlisted')::int,
    COUNT(*) FILTER (WHERE status = 'approved')::int,
    COUNT(*) FILTER (WHERE status = 'enrolled')::int,
    COUNT(*) FILTER (WHERE status = 'not_successful')::int
  INTO
    v_total_applications,
    v_total_submitted,
    v_draft_count,
    v_under_review_count,
    v_documents_required_count,
    v_shortlisted_count,
    v_approved_count,
    v_enrolled_count,
    v_rejected_count
  FROM public.applications;

  -- Registered users count (lightweight — auth.users PK scan)
  SELECT COUNT(*)::int INTO v_total_registered FROM auth.users;

  -- Recent 6 submissions (uses idx_applications_created_at index)
  SELECT COALESCE(json_agg(r), '[]'::json) INTO recent_rows
  FROM (
    SELECT 
      a.id,
      COALESCE(a.application_number, 'FSF-PENDING') AS app_number,
      TRIM(CONCAT(
        COALESCE(a.personal->>'firstName', a.personal->>'first_name', ''),
        ' ',
        COALESCE(a.personal->>'lastName', a.personal->>'last_name', '')
      )) AS applicant_name,
      COALESCE(p.name, 'General') AS programme,
      COALESCE(a.level::text, 'ND') AS level,
      a.status::text AS status,
      a.submitted_at,
      a.created_at
    FROM public.applications a
    LEFT JOIN public.programmes p ON p.id = a.programme_id
    ORDER BY a.created_at DESC
    LIMIT 6
  ) r;

  -- Programme breakdown (single grouped scan, non-drafts only)
  SELECT COALESCE(json_agg(p_count), '[]'::json) INTO prog_rows
  FROM (
    SELECT 
      COALESCE(p.id::text, 'unknown') AS id,
      COALESCE(p.name, 'General') AS name,
      COUNT(a.id)::int AS count
    FROM public.applications a
    LEFT JOIN public.programmes p ON p.id = a.programme_id
    WHERE a.status != 'draft'
    GROUP BY p.id, p.name
  ) p_count;

  -- Level breakdown (single grouped scan, non-drafts only)
  SELECT COALESCE(json_agg(l_count), '[]'::json) INTO level_rows
  FROM (
    SELECT 
      COALESCE(a.level::text, 'ND') AS level,
      COUNT(a.id)::int AS count
    FROM public.applications a
    WHERE a.status != 'draft'
    GROUP BY a.level
  ) l_count;

  -- Build final JSON from pre-computed variables (zero additional IO)
  metrics_result := json_build_object(
    'total_registered', v_total_registered,
    'total_applications', v_total_applications,
    'total_submitted', v_total_submitted,
    'draft_count', v_draft_count,
    'under_review_count', v_under_review_count,
    'documents_required_count', v_documents_required_count,
    'shortlisted_count', v_shortlisted_count,
    'approved_count', v_approved_count,
    'enrolled_count', v_enrolled_count,
    'rejected_count', v_rejected_count,
    'by_programme', prog_rows,
    'by_level', level_rows,
    'recent_submissions', recent_rows
  );

  RETURN metrics_result;
END;
$$;

-- 7. Performance Indexes (eliminates Disk IO exhaustion on Free Tier)
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_level ON public.applications(level);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_campaign_status ON public.applications(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_status_history_app_id ON public.application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_active ON public.staff_profiles(user_id, active);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 8. Permissions & Grants
REVOKE ALL ON FUNCTION public.list_registered_users() FROM public;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_application_document(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_application_document(uuid, uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.register_application_document(uuid, text, text, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.register_application_document(uuid, text, text, text, text, bigint) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.request_application_document(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_application_document(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics() FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated, service_role;

COMMIT;
