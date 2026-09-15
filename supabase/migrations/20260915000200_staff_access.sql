begin;

create table public.staff_bootstrap_allowlist (
  email text primary key check (email = lower(trim(email))),
  claimed_by uuid unique references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.staff_bootstrap_allowlist enable row level security;
revoke all on public.staff_bootstrap_allowlist from anon, authenticated;

insert into public.staff_bootstrap_allowlist (email)
values ('officialnwachukwudivine@gmail.com')
on conflict (email) do nothing;

create or replace function public.activate_allowlisted_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and exists (
    select 1
    from public.staff_bootstrap_allowlist allowed
    where allowed.email = lower(new.email)
      and allowed.claimed_by is null
  ) then
    insert into public.staff_profiles (user_id, role, permissions, active)
    values (new.id, 'super_admin', '{}', true)
    on conflict (user_id) do update set
      role = 'super_admin',
      active = true,
      updated_at = now();

    update public.staff_bootstrap_allowlist
    set claimed_by = new.id,
        claimed_at = now()
    where email = lower(new.email)
      and claimed_by is null;

    insert into public.audit_events(actor_id, action, object_type, object_id, outcome)
    values (new.id, 'staff.bootstrap_super_admin', 'staff_profile', new.id::text, 'success');
  end if;

  return new;
end;
$$;

drop trigger if exists activate_allowlisted_super_admin_after_signup on auth.users;
create trigger activate_allowlisted_super_admin_after_signup
after insert on auth.users
for each row execute function public.activate_allowlisted_super_admin();

create or replace function public.list_staff_members()
returns table (
  user_id uuid,
  email text,
  role public.staff_role,
  permissions text[],
  active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_staff_permission('manage_staff', null) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  return query
  select staff.user_id, account.email::text, staff.role, staff.permissions, staff.active, staff.created_at
  from public.staff_profiles staff
  join auth.users account on account.id = staff.user_id
  order by staff.created_at;
end;
$$;

create or replace function public.assign_staff_role(
  target_email text,
  target_role public.staff_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  current_role public.staff_role;
  role_permissions text[];
begin
  if not public.has_staff_permission('manage_staff', null) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email));

  if target_user_id is null then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  select role into current_role
  from public.staff_profiles
  where user_id = target_user_id and active;

  if current_role = 'super_admin' and target_role <> 'super_admin'
    and (select count(*) from public.staff_profiles where role = 'super_admin' and active) <= 1 then
    raise exception 'last_super_admin' using errcode = '23514';
  end if;

  role_permissions := case target_role
    when 'reviewer' then array['review_applications', 'view_documents', 'request_documents']
    when 'communications' then array['send_communications']
    else '{}'
  end;

  insert into public.staff_profiles (user_id, role, permissions, active)
  values (target_user_id, target_role, role_permissions, true)
  on conflict (user_id) do update set
    role = excluded.role,
    permissions = excluded.permissions,
    active = true,
    updated_at = now();

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome, metadata)
  values (
    (select auth.uid()),
    'staff.role_assigned',
    'staff_profile',
    target_user_id::text,
    'success',
    jsonb_build_object('role', target_role, 'email', lower(trim(target_email)))
  );
end;
$$;

create or replace function public.deactivate_staff_member(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.staff_role;
begin
  if not public.has_staff_permission('manage_staff', null) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  select role into target_role
  from public.staff_profiles
  where user_id = target_user_id and active;

  if target_role is null then
    raise exception 'staff_not_found' using errcode = 'P0002';
  end if;

  if target_role = 'super_admin'
    and (select count(*) from public.staff_profiles where role = 'super_admin' and active) <= 1 then
    raise exception 'last_super_admin' using errcode = '23514';
  end if;

  update public.staff_profiles
  set active = false,
      updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome)
  values (
    (select auth.uid()),
    'staff.deactivated',
    'staff_profile',
    target_user_id::text,
    'success'
  );
end;
$$;

revoke all on function public.list_staff_members() from public;
revoke all on function public.assign_staff_role(text, public.staff_role) from public;
revoke all on function public.deactivate_staff_member(uuid) from public;
grant execute on function public.list_staff_members() to authenticated;
grant execute on function public.assign_staff_role(text, public.staff_role) to authenticated;
grant execute on function public.deactivate_staff_member(uuid) to authenticated;

alter table public.messages
  add column priority text not null default 'normal'
  check (priority in ('normal', 'high'));

create policy messages_applicant_read on public.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.message_recipients recipient
      where recipient.message_id = id
        and recipient.applicant_id = (select auth.uid())
    )
  );

create or replace function public.send_portal_message(
  target_application_ids uuid[],
  message_subject text,
  message_body text,
  message_priority text default 'normal'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_campaign_id uuid;
  created_message_id uuid;
  recipient_count integer;
  campaign_count integer;
begin
  if coalesce(cardinality(target_application_ids), 0) = 0 then
    raise exception 'recipients_required' using errcode = '22023';
  end if;
  if char_length(trim(message_subject)) not between 1 and 180
    or char_length(trim(message_body)) not between 1 and 5000
    or message_priority not in ('normal', 'high') then
    raise exception 'invalid_message' using errcode = '22023';
  end if;

  select campaign_id
  into target_campaign_id
  from public.applications
  where id = any(target_application_ids)
    and status <> 'draft'
  limit 1;

  select count(distinct campaign_id)
  into campaign_count
  from public.applications
  where id = any(target_application_ids)
    and status <> 'draft';

  if campaign_count <> 1
    or not public.has_staff_permission('send_communications', target_campaign_id) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.applications
    where id = any(target_application_ids) and status <> 'draft'
  ) <> cardinality(target_application_ids) then
    raise exception 'invalid_recipients' using errcode = '22023';
  end if;

  insert into public.messages (
    campaign_id,
    sender_id,
    subject,
    body,
    channel,
    priority,
    idempotency_key
  ) values (
    target_campaign_id,
    actor_id,
    trim(message_subject),
    trim(message_body),
    'portal',
    message_priority,
    actor_id::text || ':' || gen_random_uuid()::text
  ) returning id into created_message_id;

  insert into public.message_recipients (message_id, applicant_id, application_id)
  select created_message_id, application.applicant_id, application.id
  from public.applications application
  where application.id = any(target_application_ids)
    and application.status <> 'draft';

  get diagnostics recipient_count = row_count;

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome, metadata)
  values (
    actor_id,
    'message.sent',
    'message',
    created_message_id::text,
    'success',
    jsonb_build_object('recipient_count', recipient_count, 'priority', message_priority)
  );

  return recipient_count;
end;
$$;

revoke all on function public.send_portal_message(uuid[], text, text, text) from public;
grant execute on function public.send_portal_message(uuid[], text, text, text) to authenticated;

create or replace function public.change_application_status(
  target_application_id uuid,
  target_status public.application_status,
  applicant_message text default null,
  internal_reason text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.applications;
  previous_status public.application_status;
begin
  select * into application_row
  from public.applications
  where id = target_application_id
  for update;

  if application_row.id is null then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;
  if not public.has_staff_permission('review_applications', application_row.campaign_id) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  previous_status := application_row.status;
  if target_status = previous_status then return application_row; end if;
  if target_status = 'draft' or not (
    (previous_status = 'submitted' and target_status in ('under_review', 'additional_documents_required', 'not_successful'))
    or (previous_status = 'under_review' and target_status in ('shortlisted', 'additional_documents_required', 'approved', 'not_successful'))
    or (previous_status = 'shortlisted' and target_status in ('additional_documents_required', 'approved', 'not_successful'))
    or (previous_status = 'additional_documents_required' and target_status = 'under_review')
    or (previous_status = 'approved' and target_status = 'enrolled')
  ) then
    raise exception 'invalid_status_transition' using errcode = '23514';
  end if;

  update public.applications
  set status = target_status,
      version = version + 1,
      updated_at = now()
  where id = target_application_id
  returning * into application_row;

  insert into public.application_status_history(
    application_id, from_status, to_status, changed_by, applicant_message, internal_reason
  ) values (
    target_application_id, previous_status, target_status, (select auth.uid()),
    nullif(trim(applicant_message), ''), nullif(trim(internal_reason), '')
  );

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome, metadata)
  values (
    (select auth.uid()), 'application.status_changed', 'application',
    target_application_id::text, 'success',
    jsonb_build_object('from', previous_status, 'to', target_status)
  );

  return application_row;
end;
$$;

create or replace function public.add_application_note(target_application_id uuid, note_body text)
returns public.internal_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
  created_note public.internal_notes;
begin
  if char_length(trim(note_body)) not between 1 and 4000 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  select application.campaign_id into campaign_id
  from public.applications application where application.id = target_application_id;
  if campaign_id is null then raise exception 'application_not_found' using errcode = 'P0002'; end if;
  if not public.has_staff_permission('review_applications', campaign_id) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  insert into public.internal_notes(application_id, author_id, body)
  values (target_application_id, (select auth.uid()), trim(note_body))
  returning * into created_note;

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome)
  values ((select auth.uid()), 'application.note_added', 'application', target_application_id::text, 'success');
  return created_note;
end;
$$;

create or replace function public.request_application_document(
  target_application_id uuid,
  requested_document_type text
)
returns public.application_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
  created_document public.application_documents;
begin
  if char_length(trim(requested_document_type)) not between 1 and 120 then
    raise exception 'invalid_document_type' using errcode = '22023';
  end if;
  select application.campaign_id into campaign_id
  from public.applications application where application.id = target_application_id;
  if campaign_id is null then raise exception 'application_not_found' using errcode = 'P0002'; end if;
  if not public.has_staff_permission('request_documents', campaign_id) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  insert into public.application_documents(application_id, requested_by, document_type, requested_at)
  values (target_application_id, (select auth.uid()), trim(requested_document_type), now())
  returning * into created_document;

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome)
  values ((select auth.uid()), 'application.document_requested', 'application', target_application_id::text, 'success');
  return created_document;
end;
$$;

-- File metadata is registered through trusted functions so an applicant can
-- never self-certify an upload as malware-free through the REST API.
create or replace function public.register_application_document(
  target_application_id uuid,
  target_document_type text,
  target_display_name text,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if not exists (
    select 1 from public.applications application
    where application.id = target_application_id
      and application.applicant_id = (select auth.uid())
      and application.status = 'draft'
  ) then
    raise exception 'draft_application_required' using errcode = '42501';
  end if;
  if target_mime_type not in ('application/pdf', 'image/jpeg', 'image/png')
     or target_size_bytes not between 1 and 10485760
     or target_storage_path not like (select auth.uid())::text || '/' || target_application_id::text || '/%'
     or char_length(trim(target_document_type)) not between 1 and 120
     or char_length(trim(target_display_name)) not between 1 and 255 then
    raise exception 'invalid_document_metadata' using errcode = '22023';
  end if;

  insert into public.application_documents(
    application_id, document_type, display_name, storage_path, mime_type,
    size_bytes, uploaded_at, scan_status
  ) values (
    target_application_id, trim(target_document_type), trim(target_display_name),
    target_storage_path, target_mime_type, target_size_bytes, now(), 'pending'
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.complete_requested_document_upload(
  target_document_id uuid,
  target_application_id uuid,
  target_display_name text,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_mime_type not in ('application/pdf', 'image/jpeg', 'image/png')
     or target_size_bytes not between 1 and 10485760
     or target_storage_path not like (select auth.uid())::text || '/' || target_application_id::text || '/%'
     or char_length(trim(target_display_name)) not between 1 and 255 then
    raise exception 'invalid_document_metadata' using errcode = '22023';
  end if;

  update public.application_documents document
  set display_name = trim(target_display_name),
      storage_path = target_storage_path,
      mime_type = target_mime_type,
      size_bytes = target_size_bytes,
      uploaded_at = now(),
      scan_status = 'pending'
  from public.applications application
  where document.id = target_document_id
    and document.application_id = target_application_id
    and document.requested_at is not null
    and application.id = document.application_id
    and application.applicant_id = (select auth.uid());

  if not found then
    raise exception 'document_request_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.change_application_status(uuid, public.application_status, text, text) from public;
revoke all on function public.add_application_note(uuid, text) from public;
revoke all on function public.request_application_document(uuid, text) from public;
revoke all on function public.register_application_document(uuid, text, text, text, text, bigint) from public;
revoke all on function public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) from public;
grant execute on function public.change_application_status(uuid, public.application_status, text, text) to authenticated;
grant execute on function public.add_application_note(uuid, text) to authenticated;
grant execute on function public.request_application_document(uuid, text) to authenticated;
grant execute on function public.register_application_document(uuid, text, text, text, text, bigint) to authenticated;
grant execute on function public.complete_requested_document_upload(uuid, uuid, text, text, text, bigint) to authenticated;

revoke insert, update on public.application_documents from authenticated;

drop policy if exists application_documents_storage_select on storage.objects;
create policy application_documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.application_documents document
        join public.applications application on application.id = document.application_id
        where document.storage_path = name
          and document.scan_status = 'clean'
          and (select public.has_staff_permission('view_documents', application.campaign_id))
      )
    )
  );

commit;
