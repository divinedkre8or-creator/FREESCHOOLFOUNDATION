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

-- 4. Permissions & Grants
REVOKE ALL ON FUNCTION public.list_registered_users() FROM public;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO service_role;

REVOKE ALL ON FUNCTION public.verify_application_document(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_application_document(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_application_document(uuid, uuid, text, text) TO service_role;

COMMIT;
