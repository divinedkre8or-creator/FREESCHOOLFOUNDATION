begin;

create or replace function public.list_registered_users()
returns table (
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
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_staff_permission('review_applications', null)
    or public.has_staff_permission('manage_staff', null)
  ) then
    raise exception 'staff_permission_required' using errcode = '42501';
  end if;

  return query
  select
    account.id as user_id,
    account.email::text,
    coalesce(profile.first_name, (app.personal->>'firstName')) as first_name,
    coalesce(profile.last_name, (app.personal->>'lastName')) as last_name,
    coalesce(profile.phone, (app.personal->>'phone')) as phone,
    (account.email_confirmed_at is not null) as email_confirmed,
    (app.id is not null) as has_application,
    app.id as application_id,
    app.application_number,
    coalesce(app.status::text, 'registered_only') as application_status,
    app.level::text as application_level,
    prog.name as programme_name,
    account.created_at as registered_at,
    account.last_sign_in_at
  from auth.users account
  left join public.profiles profile on profile.user_id = account.id
  left join public.applications app on app.applicant_id = account.id
  left join public.programmes prog on prog.id = app.programme_id
  where not exists (
    select 1 from public.staff_profiles staff where staff.user_id = account.id and staff.active
  )
  order by account.created_at desc;
end;
$$;

revoke all on function public.list_registered_users() from public;
grant execute on function public.list_registered_users() to authenticated;

commit;
