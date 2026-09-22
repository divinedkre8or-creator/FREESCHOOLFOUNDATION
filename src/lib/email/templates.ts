export type PlatformEmailEvent =
  | "submitted"
  | "status"
  | "document_request"
  | "message"
  | "reminder";

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type StatusEmailKey =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "additional_documents_required"
  | "approved"
  | "enrolled"
  | "not_successful";

const statusContent: Record<StatusEmailKey, { subject: string; heading: string; body: string }> = {
  submitted: {
    subject: "Your scholarship application has been received",
    heading: "Application received",
    body: "Your application is safely in our system. We will notify you when its review status changes.",
  },
  under_review: {
    subject: "Your scholarship application is under review",
    heading: "Your application is under review",
    body: "The scholarship panel has started reviewing your application. No action is needed unless we request more information.",
  },
  shortlisted: {
    subject: "You have been shortlisted",
    heading: "Application shortlisted",
    body: "Your application has progressed to the shortlist. Sign in to your portal for the latest information and next steps.",
  },
  additional_documents_required: {
    subject: "A document is required for your scholarship application",
    heading: "Action required in your portal",
    body: "The scholarship panel needs an additional document. Sign in to your portal to see the request and upload it securely.",
  },
  approved: {
    subject: "Your scholarship application has been approved",
    heading: "Application approved",
    body: "Congratulations. The scholarship panel has approved your application. Sign in to your portal to review the latest update and next steps.",
  },
  enrolled: {
    subject: "Your scholarship enrolment has been recorded",
    heading: "Enrolment recorded",
    body: "Your scholarship application now shows as enrolled. Keep your portal installed for future updates.",
  },
  not_successful: {
    subject: "Update on your scholarship application",
    heading: "Application decision available",
    body: "The scholarship panel has completed its review. Sign in to your portal to see your current application status.",
  },
};

export function buildPlatformEmail(input: {
  event: PlatformEmailEvent;
  firstName?: string | undefined;
  applicationNumber?: string | undefined;
  status?: string | undefined;
  subject?: string | undefined;
  body?: string | undefined;
  portalUrl: string;
  actionUrl?: string | undefined;
  actionText?: string | undefined;
}) {
  const content =
    input.event === "message"
      ? {
          subject: input.subject?.trim() || "New scholarship portal message",
          heading: input.subject?.trim() || "New portal message",
          body: input.body?.trim() || "You have a new message in your scholarship portal.",
        }
      : input.event === "reminder"
        ? {
            subject:
              input.subject?.trim() ||
              "Complete your Free School Foundation scholarship application",
            heading: input.subject?.trim() || "Complete your scholarship application",
            body:
              input.body?.trim() ||
              "You registered on the scholarship portal but haven't completed your application. Applying takes only a few minutes and is completely free of charge.",
          }
        : input.event === "document_request"
          ? {
              subject: "A document is required for your scholarship application",
              heading: "Document requested",
              body: input.body?.trim()
                ? `The scholarship panel requested: ${input.body.trim()}. Upload it securely from your portal.`
                : statusContent["additional_documents_required"].body,
            }
          : statusContent[
              input.event === "submitted" || !(input.status && input.status in statusContent)
                ? "submitted"
                : (input.status as StatusEmailKey)
            ];

  const safe = content ?? statusContent["submitted"];
  const greeting = input.firstName?.trim() ? `Hello ${input.firstName.trim()},` : "Hello,";
  const reference = input.applicationNumber
    ? `<p style="margin:16px 0 0;color:#66736b;font-size:13px">Application: <strong>${escapeEmailHtml(input.applicationNumber)}</strong></p>`
    : "";
  const ctaUrl = input.actionUrl || input.portalUrl;
  const ctaText =
    input.actionText ||
    (input.event === "reminder" ? "Complete scholarship application" : "Open applicant portal");

  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#17201b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dfe7e2;border-radius:16px"><tr><td style="padding:28px"><p style="margin:0;color:#167a42;font-size:14px;font-weight:700">THE FREE SCHOOL FOUNDATION</p><h1 style="margin:16px 0 8px;font-size:26px">${escapeEmailHtml(safe.heading)}</h1><p style="margin:0 0 12px;line-height:1.6">${escapeEmailHtml(greeting)}</p><p style="margin:0;line-height:1.6;color:#56625b">${escapeEmailHtml(safe.body)}</p>${reference}<a href="${escapeEmailHtml(ctaUrl)}" style="display:inline-block;margin-top:22px;background:#167a42;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:9px">${escapeEmailHtml(ctaText)}</a><p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b756f">This is an application-service message. Applying is free—never pay anyone to submit an application.</p></td></tr></table></td></tr></table></body></html>`;
  return {
    subject: safe.subject,
    html,
    text: `${greeting}\n\n${safe.body}${input.applicationNumber ? `\n\nApplication: ${input.applicationNumber}` : ""}\n\n${ctaText}: ${ctaUrl}`,
  };
}
