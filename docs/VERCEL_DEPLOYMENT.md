# Vercel Deployment

Import the GitHub repository into Vercel and leave the root directory at the repository root. The framework preset must show **TanStack Start**. `vercel.json` and the Nitro `vercel` preset are committed so Vercel can detect the full-stack server functions.

Add these environment variables in **Vercel → Project → Settings → Environment Variables** for Production and Preview:

## Public browser configuration

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Private server configuration

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `APP_BASE_URL`

Use this sender value exactly:

```text
The Free School Foundation <notifications@updates.thefreeschoolfoundation.com.ng>
```

`APP_BASE_URL` must be the final HTTPS website address, without a trailing slash. Do not add `VITE_` to `RESEND_API_KEY` or any other private secret.

After the first deployment, update the Supabase Auth Site URL and redirect allow-list with the final Vercel/custom domain. Then redeploy and test signup confirmation, login, submission, status email, document request, portal notification, and direct URL refreshes.
