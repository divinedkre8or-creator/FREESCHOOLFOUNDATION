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
