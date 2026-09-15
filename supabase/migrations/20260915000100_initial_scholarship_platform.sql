begin;

create extension if not exists pgcrypto with schema extensions;

create type public.application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'shortlisted',
  'additional_documents_required',
  'approved',
  'enrolled',
  'not_successful'
);

create type public.qualification_level as enum ('nd', 'hnd');
create type public.campaign_status as enum ('draft', 'active', 'closed');
create type public.staff_role as enum ('super_admin', 'reviewer', 'communications', 'viewer');
create type public.message_channel as enum ('portal', 'sms');
create type public.delivery_status as enum ('pending', 'processing', 'delivered', 'failed');
create type public.document_scan_status as enum ('pending', 'clean', 'rejected', 'failed');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  permissions text[] not null default '{}',
  campaign_ids uuid[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 180),
  partner_name text,
  description text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.campaign_status not null default 'draft',
  timezone text not null default 'Africa/Lagos',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.campaign_programmes (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  programme_id uuid not null references public.programmes(id),
  levels public.qualification_level[] not null,
  eligibility jsonb not null default '{}',
  initial_document_rules jsonb not null default '[]',
  primary key (campaign_id, programme_id),
  check (cardinality(levels) > 0)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  programme_id uuid references public.programmes(id) on delete restrict,
  level public.qualification_level,
  status public.application_status not null default 'draft',
  application_number text unique,
  current_step smallint not null default 1 check (current_step between 1 and 6),
  version integer not null default 1 check (version > 0),
  personal jsonb not null default '{}',
  education jsonb not null default '{}',
  scholarship_responses jsonb not null default '{}',
  declaration_accepted_at timestamptz,
  communication_consent boolean,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, campaign_id),
  check (
    (status = 'draft' and application_number is null and submitted_at is null)
    or
    (status <> 'draft' and application_number is not null and submitted_at is not null)
  )
);

create index applications_applicant_id_idx on public.applications(applicant_id);
create index applications_campaign_status_idx on public.applications(campaign_id, status);
create index applications_programme_level_idx on public.applications(programme_id, level);
create index applications_created_at_idx on public.applications(created_at desc);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  requested_by uuid references auth.users(id),
  document_type text not null check (char_length(document_type) between 1 and 120),
  display_name text,
  storage_path text unique,
  mime_type text,
  size_bytes bigint check (size_bytes between 1 and 10485760),
  checksum_sha256 text,
  requested_at timestamptz,
  uploaded_at timestamptz,
  scan_status public.document_scan_status,
  created_at timestamptz not null default now(),
  check (
    (uploaded_at is null and storage_path is null)
    or
    (uploaded_at is not null and storage_path is not null and scan_status is not null)
  )
);

create index application_documents_application_id_idx
  on public.application_documents(application_id);

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid not null references auth.users(id),
  applicant_message text,
  internal_reason text,
  created_at timestamptz not null default now()
);

create index application_status_history_application_id_idx
  on public.application_status_history(application_id, created_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  sender_id uuid not null references auth.users(id),
  subject text not null check (char_length(subject) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  channel public.message_channel not null default 'portal',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.message_recipients (
  message_id uuid not null references public.messages(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  read_at timestamptz,
  delivery_status public.delivery_status not null default 'pending',
  provider_reference text,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key (message_id, applicant_id)
);

create index message_recipients_applicant_id_idx
  on public.message_recipients(applicant_id, updated_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  audience jsonb not null default '{"kind":"all"}',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  object_type text not null,
  object_id text not null,
  outcome text not null check (outcome in ('success', 'denied', 'failed')),
  correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_events_object_idx
  on public.audit_events(object_type, object_id, created_at desc);

create table public.outbox_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  processed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);

create index outbox_events_pending_idx
  on public.outbox_events(available_at, id)
  where processed_at is null;

create table public.application_number_counters (
  year integer primary key check (year between 2020 and 2200),
  last_value integer not null check (last_value > 0)
);

create or replace function public.has_staff_permission(
  required_permission text,
  target_campaign_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles staff
    where staff.user_id = (select auth.uid())
      and staff.active
      and (
        staff.role = 'super_admin'
        or required_permission = any(staff.permissions)
      )
      and (
        target_campaign_id is null
        or staff.campaign_ids is null
        or target_campaign_id = any(staff.campaign_ids)
      )
  );
$$;

revoke all on function public.has_staff_permission(text, uuid) from public;
grant execute on function public.has_staff_permission(text, uuid) to authenticated;

create or replace function public.submit_application(target_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  application_row public.applications;
  submission_year integer := extract(year from timezone('Africa/Lagos', now()))::integer;
  sequence_value integer;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into application_row
  from public.applications
  where id = target_application_id and applicant_id = actor_id
  for update;

  if application_row.id is null then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;

  if application_row.status <> 'draft' then
    return application_row;
  end if;

  if application_row.programme_id is null
    or application_row.level is null
    or application_row.personal = '{}'::jsonb
    or application_row.education = '{}'::jsonb
    or application_row.scholarship_responses = '{}'::jsonb
    or application_row.declaration_accepted_at is null
    or application_row.communication_consent is null then
    raise exception 'application_incomplete' using errcode = '22023';
  end if;

  insert into public.application_number_counters(year, last_value)
  values (submission_year, 1)
  on conflict (year) do update
    set last_value = public.application_number_counters.last_value + 1
  returning last_value into sequence_value;

  update public.applications
  set status = 'submitted',
      application_number = 'FSF-' || submission_year || '-' || lpad(sequence_value::text, 6, '0'),
      submitted_at = now(),
      updated_at = now(),
      version = version + 1
  where id = target_application_id
  returning * into application_row;

  insert into public.application_status_history(
    application_id,
    from_status,
    to_status,
    changed_by,
    applicant_message
  ) values (
    application_row.id,
    'draft',
    'submitted',
    actor_id,
    'Your application has been received and will be reviewed by the Foundation.'
  );

  insert into public.audit_events(actor_id, action, object_type, object_id, outcome)
  values (actor_id, 'application.submitted', 'application', application_row.id::text, 'success');

  return application_row;
end;
$$;

revoke all on function public.submit_application(uuid) from public;
grant execute on function public.submit_application(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.programmes enable row level security;
alter table public.campaign_programmes enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.internal_notes enable row level security;
alter table public.application_status_history enable row level security;
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_events enable row level security;
alter table public.outbox_events enable row level security;
alter table public.application_number_counters enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy staff_profiles_select_self_or_admin on public.staff_profiles
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (select public.has_staff_permission('manage_staff', null))
  );

create policy campaigns_public_active on public.campaigns
  for select to anon, authenticated
  using (
    (status = 'active' and now() between opens_at and closes_at)
    or (select public.has_staff_permission('manage_campaigns', id))
  );
create policy campaigns_admin_insert on public.campaigns
  for insert to authenticated
  with check ((select public.has_staff_permission('manage_campaigns', id)));
create policy campaigns_admin_update on public.campaigns
  for update to authenticated
  using ((select public.has_staff_permission('manage_campaigns', id)))
  with check ((select public.has_staff_permission('manage_campaigns', id)));

create policy programmes_public_read on public.programmes
  for select to anon, authenticated using (active);
create policy campaign_programmes_public_read on public.campaign_programmes
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.campaigns campaign
      where campaign.id = campaign_id
        and campaign.status = 'active'
        and now() between campaign.opens_at and campaign.closes_at
    )
    or (select public.has_staff_permission('manage_campaigns', campaign_id))
  );

create policy applications_select_own_or_reviewer on public.applications
  for select to authenticated
  using (
    (select auth.uid()) = applicant_id
    or (select public.has_staff_permission('review_applications', campaign_id))
  );
create policy applications_insert_own on public.applications
  for insert to authenticated
  with check (
    (select auth.uid()) = applicant_id
    and status = 'draft'
    and exists (
      select 1 from public.campaigns campaign
      where campaign.id = campaign_id
        and campaign.status = 'active'
        and now() between campaign.opens_at and campaign.closes_at
    )
  );
create policy applications_update_own_draft on public.applications
  for update to authenticated
  using ((select auth.uid()) = applicant_id and status = 'draft')
  with check ((select auth.uid()) = applicant_id and status = 'draft');

create policy documents_select_owner_or_staff on public.application_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.applications application
      where application.id = application_id
        and (
          application.applicant_id = (select auth.uid())
          or (select public.has_staff_permission('view_documents', application.campaign_id))
        )
    )
  );
create policy documents_insert_owner_or_staff on public.application_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from public.applications application
      where application.id = application_id
        and (
          (application.applicant_id = (select auth.uid()) and application.status = 'draft')
          or (select public.has_staff_permission('request_documents', application.campaign_id))
        )
    )
  );
create policy documents_update_owner_or_staff on public.application_documents
  for update to authenticated
  using (
    exists (
      select 1 from public.applications application
      where application.id = application_id
        and (
          application.applicant_id = (select auth.uid())
          or (select public.has_staff_permission('request_documents', application.campaign_id))
        )
    )
  );

create policy internal_notes_staff_only on public.internal_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.applications application
      where application.id = application_id
        and (select public.has_staff_permission('review_applications', application.campaign_id))
    )
  );
create policy internal_notes_staff_insert on public.internal_notes
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.applications application
      where application.id = application_id
        and (select public.has_staff_permission('review_applications', application.campaign_id))
    )
  );

create policy status_history_owner_or_staff on public.application_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.applications application
      where application.id = application_id
        and (
          application.applicant_id = (select auth.uid())
          or (select public.has_staff_permission('review_applications', application.campaign_id))
        )
    )
  );

create policy messages_staff_read on public.messages
  for select to authenticated
  using ((select public.has_staff_permission('send_communications', campaign_id)));
create policy message_recipients_owner_or_staff on public.message_recipients
  for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or exists (
      select 1 from public.applications application
      where application.id = application_id
        and (select public.has_staff_permission('send_communications', application.campaign_id))
    )
  );
create policy message_recipients_owner_update_read on public.message_recipients
  for update to authenticated
  using (applicant_id = (select auth.uid()))
  with check (applicant_id = (select auth.uid()));

create policy announcements_visible_to_campaign on public.announcements
  for select to authenticated
  using (
    published_at is not null
    and (
      exists (
        select 1 from public.applications application
        where application.campaign_id = campaign_id
          and application.applicant_id = (select auth.uid())
      )
      or (select public.has_staff_permission('send_communications', campaign_id))
    )
  );

revoke all on all tables in schema public from anon, authenticated;
grant select on public.campaigns, public.programmes, public.campaign_programmes to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.staff_profiles to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert, update on public.application_documents to authenticated;
grant select, insert on public.internal_notes to authenticated;
grant select on public.application_status_history to authenticated;
grant select on public.messages to authenticated;
grant select, update on public.message_recipients to authenticated;
grant select on public.announcements to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy application_documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
          and (select public.has_staff_permission('view_documents', application.campaign_id))
      )
    )
  );

-- Required launch reference data. These inserts are idempotent so the same
-- values can also be maintained by supabase/seed.sql during local development.
insert into public.programmes (id, name, slug, description)
values
  ('10000000-0000-0000-0000-000000000001', 'Mass Communication', 'mass-communication', 'Media, communication, public relations and digital content.'),
  ('10000000-0000-0000-0000-000000000002', 'Business Administration and Management', 'business-administration-and-management', 'Management, enterprise, accounting foundations and operations.'),
  ('10000000-0000-0000-0000-000000000003', 'Computer Science', 'computer-science', 'Programming, databases, networking and technology problem solving.'),
  ('10000000-0000-0000-0000-000000000004', 'Electrical Engineering', 'electrical-engineering', 'Electrical systems, electronics, power and maintenance practice.'),
  ('10000000-0000-0000-0000-000000000005', 'Computer Engineering', 'computer-engineering', 'Computer hardware, embedded systems, networking and maintenance.')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description;

insert into public.campaigns (
  id,
  slug,
  title,
  partner_name,
  description,
  opens_at,
  closes_at,
  status,
  timezone
)
values (
  '20000000-0000-0000-0000-000000000001',
  'citi-polytechnic-odel-2026',
  'Citi Polytechnic ODeL Scholarship 2026',
  'Citi Polytechnic Abuja',
  'A 100% funded ND and HND opportunity from The Free School Foundation.',
  '2026-08-01T00:00:00+01:00',
  '2026-11-30T23:59:59+01:00',
  'active',
  'Africa/Lagos'
)
on conflict (id) do update set
  title = excluded.title,
  partner_name = excluded.partner_name,
  description = excluded.description,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  status = excluded.status,
  timezone = excluded.timezone;

insert into public.campaign_programmes (campaign_id, programme_id, levels)
select
  '20000000-0000-0000-0000-000000000001',
  programme.id,
  array['nd', 'hnd']::public.qualification_level[]
from public.programmes programme
on conflict (campaign_id, programme_id) do update set
  levels = excluded.levels;

commit;
