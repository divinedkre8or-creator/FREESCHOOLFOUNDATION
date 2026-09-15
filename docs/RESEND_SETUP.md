# Direct Resend Platform Email Setup

## Delivery split

- Supabase Auth continues to send signup confirmation and password-recovery messages.
- The application server calls the Resend HTTP API directly for post-confirmation platform email.
- Resend is not configured as Supabase custom SMTP.

Current direct-email events:

- Application submitted acknowledgement
- Under review, shortlisted, additional documents required, approved, enrolled, and unsuccessful status updates
- Document requests
- Individual administrator messages
- Status-targeted administrator communications

Each administrator communication is also stored in the applicant portal. Direct Resend calls are authorized using the current Supabase session and database permissions. The Resend API key never reaches the browser.

## One-time Resend setup

1. Create the Resend account.
2. Add a sending domain or dedicated sending subdomain that the Foundation controls.
3. Add the SPF and DKIM DNS records shown by Resend and wait for the domain to show `verified`. Add DMARC as an additional deliverability safeguard.
4. Create an API key with sending access.
5. In the deployment provider's server secret/environment settings, add:

   ```text
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL="The Free School Foundation <notifications@updates.thefreeschoolfoundation.com.ng>"
   RESEND_REPLY_TO=officialnwachukwudivine@gmail.com
   APP_BASE_URL=https://your-production-domain.example
   ```

6. Add the same variables to local `.env.local` only when testing locally. Never use a `VITE_` prefix, commit the key, or paste it into chat.
7. Restart the local server or redeploy after adding the variables.
8. Test one submission, one status change, one document request, and one Communications send. Confirm both the portal message and Resend delivery log.

The implementation sends transactional batches of at most 100 recipients per Resend request and uses a 24-hour idempotency key to protect retries from duplicate delivery.

## Marketing boundary

The current system sends application-service messages to existing applicants. Do not use it for unrelated promotional marketing until the Foundation has approved separate marketing consent, unsubscribe handling, suppression lists, and campaign content. Resend recommends Broadcasts for marketing campaigns.

Official references: https://resend.com/docs/api-reference/emails/send-email, https://resend.com/docs/api-reference/emails/send-batch-emails, https://resend.com/docs/dashboard/emails/idempotency-keys, and https://resend.com/docs/dashboard/domains/introduction
