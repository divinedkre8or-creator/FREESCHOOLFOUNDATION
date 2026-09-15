# Applicant Document Malware Scanning

Uploads remain private and quarantined until the `scan-document` Supabase Edge Function records a `clean` result. Staff storage access is denied for pending, failed, and rejected files. Rejected files are removed from Storage.

## Activation

1. Create a Cloudmersive account and obtain a Virus Scan API key only after the Foundation approves Cloudmersive as a document subprocessor.
2. Add `CLOUDMERSIVE_API_KEY` to the Supabase project under **Edge Functions → Secrets**. Never add it to a `VITE_*` variable, git, or chat.
3. Deploy `supabase/functions/scan-document` to the linked project.
4. Upload the PDF, JPG, and PNG test fixtures permitted by the application, then confirm they become `clean`.
5. Upload the harmless EICAR antivirus test file in a non-production test application and confirm the record becomes `rejected` and the stored object is removed.
6. Confirm a staff account cannot download files whose scan status is `pending`, `failed`, or `rejected`.

Operationally monitor scan failures and provider quota. A failed scan must be retried by an authorized operator; it must never be treated as clean.
