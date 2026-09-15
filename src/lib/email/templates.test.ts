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
});
