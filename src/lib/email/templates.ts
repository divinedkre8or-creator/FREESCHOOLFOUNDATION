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

function formatInline(text: string): string {
  // Convert **bold** to <strong>
  let formatted = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Convert *italic* to <em>
  formatted = formatted.replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, "$1<em>$2</em>$3");
  // Convert plain URLs to clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s<"']+)/g,
    '<a href="$1" style="color:#167a42;font-weight:600;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return formatted;
}

export function formatEmailBodyHtml(rawBody: string): string {
  if (!rawBody?.trim()) return "";

  const lines = rawBody.split(/\r?\n/);
  const blocks: string[] = [];
  let currentList: string[] = [];

  function flushList() {
    if (currentList.length > 0) {
      blocks.push(
        `<ul style="margin:10px 0 16px 0;padding-left:22px;color:#374151;font-size:14px;line-height:1.65">${currentList
          .map((item) => `<li style="margin-bottom:6px;color:#374151">${item}</li>`)
          .join("")}</ul>`,
      );
      currentList = [];
    }
  }

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      i++;
      continue;
    }

    // Skip redundant leading salutation if already handled outside
    if (i === 0 && /^(dear scholar|dear applicant|hello|hi)[,:]?$/i.test(trimmed)) {
      i++;
      continue;
    }

    // Check for bullet list item (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(formatInline(escapeEmailHtml(bulletMatch[1]!)));
      i++;
      continue;
    }

    flushList();

    // Check for markdown headers (e.g. ## Heading or ### Heading)
    const mdHeaderMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (mdHeaderMatch) {
      const headerText = formatInline(escapeEmailHtml(mdHeaderMatch[2]!));
      blocks.push(
        `<h3 style="margin:22px 0 8px;font-size:16px;font-weight:700;color:#111827;line-height:1.4">${headerText}</h3>`,
      );
      i++;
      continue;
    }

    // Check for numbered section headers (e.g. "1. Physical On-Ground Resumption (Study Center, Aba)")
    const numberedMatch = trimmed.match(/^(\d+[\.\)]\s+)(.+)$/);
    if (numberedMatch && trimmed.length < 130 && !trimmed.endsWith(".")) {
      const isMandatory = /mandatory|urgent|action required|important/i.test(trimmed);
      const headerText = formatInline(escapeEmailHtml(trimmed));
      if (isMandatory) {
        blocks.push(
          `<div style="margin:22px 0 10px;padding:12px 14px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;font-size:15px;font-weight:700;color:#15803d">${headerText}</div>`,
        );
      } else {
        blocks.push(
          `<div style="margin:20px 0 8px;padding-left:10px;border-left:3px solid #167a42"><span style="font-size:15px;font-weight:700;color:#111827">${headerText}</span></div>`,
        );
      }
      i++;
      continue;
    }

    // Check for closing sign-off block (e.g. "Warm regards,", "The Admissions...")
    const isSignoff = /^(warm regards|best regards|kind regards|sincerely|yours faithfully|the admissions)/i.test(
      trimmed,
    );
    if (isSignoff) {
      const sigLines: string[] = [];
      while (i < lines.length) {
        const sigLine = lines[i]?.trim();
        if (sigLine) {
          sigLines.push(formatInline(escapeEmailHtml(sigLine)));
        }
        i++;
      }
      blocks.push(
        `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;color:#4b5563;font-size:14px;line-height:1.6">${sigLines.join("<br/>")}</div>`,
      );
      break;
    }

    // Standard paragraph
    const formattedParagraph = formatInline(escapeEmailHtml(trimmed));
    blocks.push(
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151">${formattedParagraph}</p>`,
    );
    i++;
  }

  flushList();
  return blocks.join("");
}

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
              subject:
                input.subject?.trim() ||
                "Action required: Document requested for your scholarship application",
              heading: "Document Requested",
              body: input.body?.trim()
                ? `The scholarship review committee has requested you to upload an additional document: "${input.body.trim()}". Please sign in to your candidate portal and upload it securely to continue processing your scholarship application.`
                : statusContent["additional_documents_required"].body,
            }
          : (() => {
              const base =
                statusContent[
                  input.event === "submitted" || !(input.status && input.status in statusContent)
                    ? "submitted"
                    : (input.status as StatusEmailKey)
                ] ?? statusContent["submitted"];
              return {
                subject: input.subject?.trim() || base.subject,
                heading: base.heading,
                body: input.body?.trim()
                  ? `${base.body}\n\nNote from scholarship panel:\n"${input.body.trim()}"`
                  : base.body,
              };
            })();

  const safe = content ?? statusContent["submitted"];
  const greeting = input.firstName?.trim() ? `Hello ${input.firstName.trim()},` : "Hello Scholar,";
  const formattedBodyHtml = formatEmailBodyHtml(safe.body);

  const referenceHtml = input.applicationNumber
    ? `<div style="margin:16px 0;padding:10px 14px;background:#f8faf9;border:1px dashed #cbd5e1;border-radius:8px;font-size:13px;color:#4b5563">Application Number: <strong style="color:#111827">${escapeEmailHtml(input.applicationNumber)}</strong></div>`
    : "";

  const ctaUrl = input.actionUrl || input.portalUrl;
  const ctaText =
    input.actionText ||
    (input.event === "reminder"
      ? "Complete Scholarship Application"
      : input.event === "document_request"
        ? "Upload Requested Document"
        : input.event === "message"
          ? "View Portal Message"
          : "Open Applicant Portal");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeEmailHtml(safe.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17201b;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7f5;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe7e2;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.04)">
          <!-- Brand Accent Header Bar -->
          <tr>
            <td style="height:4px;background:#167a42"></td>
          </tr>
          <!-- Main Content Body -->
          <tr>
            <td style="padding:32px 28px">
              <!-- Header Brand Tag -->
              <p style="margin:0 0 12px;color:#167a42;font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">The Free School Foundation</p>
              
              <!-- Subject Heading -->
              <h1 style="margin:0 0 18px;font-size:22px;font-weight:800;color:#111827;line-height:1.35">${escapeEmailHtml(safe.heading)}</h1>
              
              <!-- Salutation Greeting -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1f2937;line-height:1.5">${escapeEmailHtml(greeting)}</p>
              
              <!-- Rich Formatted Body -->
              <div style="font-size:15px;line-height:1.65;color:#374151">
                ${formattedBodyHtml}
              </div>
              
              ${referenceHtml}
              
              <!-- Primary CTA Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 16px">
                <tr>
                  <td align="center" style="border-radius:8px;background:#167a42">
                    <a href="${escapeEmailHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-family:inherit;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px">
                      ${escapeEmailHtml(ctaText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer Guarantee & Anti-Fraud Notice -->
              <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.55;color:#6b7280">
                <p style="margin:0 0 6px"><strong>Important:</strong> Applying for The Free School Foundation scholarships is 100% free of charge. Never pay any fee or intermediary for admission.</p>
                <p style="margin:0">Direct Portal Link: <a href="${escapeEmailHtml(ctaUrl)}" style="color:#167a42;text-decoration:underline">${escapeEmailHtml(ctaUrl)}</a></p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: safe.subject,
    html,
    text: `${greeting}\n\n${safe.body}${input.applicationNumber ? `\n\nApplication: ${input.applicationNumber}` : ""}\n\n${ctaText}: ${ctaUrl}`,
  };
}

