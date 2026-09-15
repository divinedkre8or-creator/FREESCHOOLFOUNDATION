# Applicant Launch Runbook

Last updated: 2026-09-15

## 1. Install the Supabase schema

Open the Supabase dashboard for project `amzcvuknjtpsrktkdhcf`, choose **SQL Editor**, create a new query, and paste the complete contents of:

`supabase/migrations/20260915000100_initial_scholarship_platform.sql`

Run it once. The migration is wrapped in a transaction: if any statement fails, the database changes roll back together. Do not repeatedly run a partially modified copy.

Verify the result in a second SQL Editor query:

```sql
select
  to_regclass('public.applications') as applications_table,
  to_regclass('public.staff_profiles') as staff_profiles_table,
  (select count(*) from public.programmes) as programme_count,
  (select count(*) from public.campaigns where status = 'active') as active_campaign_count;
```

Expected: both table names are present, `programme_count` is `5`, and `active_campaign_count` is `1`.

## 2. Confirm applicant authentication

In **Authentication > Providers > Email**, keep email/password enabled. Decide whether **Confirm email** is required. If enabled, applicants must use the confirmation message before logging in.

For local preview, add `http://localhost:4173/apply` and `http://localhost:4173/login` to the permitted redirect URLs. Before public deployment, set the Supabase Site URL to the production origin and add both corresponding production routes to redirect URLs.

## 2A. Activate scholarship-panel administration

Run `supabase/migrations/20260915000200_staff_access.sql` in the SQL Editor before the first administrator signs up. The migration allowlists `officialnwachukwudivine@gmail.com`; only that exact account is automatically granted the initial super-admin role.

The first approved administrator creates an account at `/admin-access`, confirms the email, and signs in. A super administrator can then assign roles from `/admin/staff` after each additional staff member creates an account. The database prevents deactivation or demotion of the last active super administrator.

## 3. Smoke-test before sharing publicly

1. Open `/apply` in a private browser window.
2. Create an account with a real test email and an 8+ character password.
3. Confirm the email if required.
4. Complete and submit one application, including a small PDF or image.
5. Confirm an `FSF-YYYY-NNNNNN` number appears.
6. Sign out, then sign in at `/login` with the same email and password.
7. Confirm `/portal` displays only that applicant's application.
8. Confirm `/admin` denies the applicant account.

## 4. Current release boundaries

- Applicant registration, email/password login, final submission, private upload, application number, and applicant portal reads use Supabase.
- Staff/admin screens are access-controlled, but staff operations are not yet connected for live review work.
- A public deployment URL, production redirect configuration, monitoring, and complete browser/device acceptance evidence remain release work.
