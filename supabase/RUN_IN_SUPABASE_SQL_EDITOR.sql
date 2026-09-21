-- ==============================================================================
-- THE FREE SCHOOL FOUNDATION — ADMIN & SCRUTINY WORKFLOW SQL PATCH
-- Paste and Run this in your Supabase Project SQL Editor (https://supabase.com/dashboard/project/amzcvuknjtpsrktkdhcf/sql)
-- ==============================================================================

BEGIN;

-- 1. Ensure Super Admin access for your official account
INSERT INTO public.staff_bootstrap_allowlist (email)
VALUES ('officialnwachukwudivine@gmail.com')
ON CONFLICT (email) DO NOTHING;

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

-- 6. Permissions & Grants
REVOKE ALL ON FUNCTION public.list_registered_users() FROM public;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_application_document(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_application_document(uuid, uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.register_application_document(uuid, text, text, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.register_application_document(uuid, text, text, text, text, bigint) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) TO authenticated, service_role;

COMMIT;
