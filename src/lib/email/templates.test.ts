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
});
