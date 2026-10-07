import { describe, expect, it } from "vitest";
import { buildPlatformEmail } from "./templates";

describe("buildPlatformEmail", () => {
  it("renders the approved status and escapes applicant-controlled content", () => {
    const email = buildPlatformEmail({
      event: "status",
      firstName: "Ada <script>",
      applicationNumber: "FSF&123",
      status: "approved",
      portalUrl: "https://example.com/portal",
    });
    expect(email.subject).toContain("approved");
    expect(email.html).toContain("Ada &lt;script&gt;");
    expect(email.html).toContain("FSF&amp;123");
    expect(email.html).not.toContain("Ada <script>");
  });

  it("uses administrator message content for a portal-message email", () => {
    const email = buildPlatformEmail({
      event: "message",
      subject: "Interview update",
      body: "Open the portal for details.",
      portalUrl: "https://example.com/portal",
    });
    expect(email.subject).toBe("Interview update");
    expect(email.text).toContain("Open the portal for details.");
  });

  it("renders a reminder email with custom action url and button text", () => {
    const email = buildPlatformEmail({
      event: "reminder",
      firstName: "Chidi",
      subject: "Reminder: Finish your scholarship application",
      body: "Applications close soon. Complete your submission today.",
      portalUrl: "https://example.com/portal",
      actionUrl: "https://example.com/apply",
      actionText: "Complete Application Now",
    });
    expect(email.subject).toBe("Reminder: Finish your scholarship application");
    expect(email.html).toContain("Hello Chidi,");
    expect(email.html).toContain("Applications close soon.");
    expect(email.html).toContain('href="https://example.com/apply"');
    expect(email.html).toContain("Complete Application Now");
    expect(email.text).toContain("Complete Application Now: https://example.com/apply");
  });

  it("renders a document request email with document name and upload link", () => {
    const email = buildPlatformEmail({
      event: "document_request",
      firstName: "Ifeanyi",
      applicationNumber: "FSF-2026-0099",
      body: "National Diploma Transcript",
      portalUrl: "https://example.com/portal",
      actionUrl: "https://example.com/portal?section=documents",
      actionText: "Upload Requested Document",
    });
    expect(email.subject).toContain("Document requested");
    expect(email.html).toContain("National Diploma Transcript");
    expect(email.html).toContain("Upload Requested Document");
    expect(email.html).toContain('href="https://example.com/portal?section=documents"');
    expect(email.text).toContain("FSF-2026-0099");
  });

  it("renders a status update email with reviewer note included", () => {
    const email = buildPlatformEmail({
      event: "status",
      firstName: "Zainab",
      status: "shortlisted",
      body: "Please attend the virtual briefing on Thursday.",
      portalUrl: "https://example.com/portal",
    });
    expect(email.subject).toContain("shortlisted");
    expect(email.html).toContain("Please attend the virtual briefing on Thursday.");
    expect(email.text).toContain("Please attend the virtual briefing on Thursday.");
  });

  it("renders structured announcement emails with headings, lists, and callouts", () => {
    const body = `Following the approval of your application, welcome to the academic session.

1. Physical On-Ground Resumption (Study Center, Aba)
This programme requires full physical presence.

3. Mandatory Documents
Required documents:
- JAMB Result
- WAEC/NECO Result
- LG of Origin Document

5. MANDATORY ACTION — Confirm Your Attendance
You must confirm your attendance.

Portal Login Link: https://thefreeschoolfoundation.com.ng/portal

Warm regards,
The Admissions Directorate`;

    const email = buildPlatformEmail({
      event: "message",
      firstName: "Emmanuel",
      subject: "Official Resumption Notice",
      body,
      portalUrl: "https://thefreeschoolfoundation.com.ng/portal",
    });

    // Check headings and sections
    expect(email.html).toContain("1. Physical On-Ground Resumption (Study Center, Aba)");
    // Check styled list
    expect(email.html).toContain("<ul");
    expect(email.html).toContain(">JAMB Result</li>");
    expect(email.html).toContain(">WAEC/NECO Result</li>");
    // Check mandatory callout
    expect(email.html).toContain("5. MANDATORY ACTION — Confirm Your Attendance");
    // Check link conversion
    expect(email.html).toContain('href="https://thefreeschoolfoundation.com.ng/portal"');
    // Check signature block
    expect(email.html).toContain("The Admissions Directorate");
  });
});
