import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { buildPlatformEmail } from "./templates";
import type { PlatformEmailEvent } from "./templates";

const inputSchema = z.object({
  accessToken: z.string().min(20),
  applicationIds: z.array(z.string().uuid()).min(1).max(100),
  event: z.enum(["submitted", "status", "document_request", "message"]),
  subject: z.string().trim().max(180).optional(),
  body: z.string().trim().max(5000).optional(),
});

const sendPlatformEmailBatch = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { url: supabaseUrl, publishableKey } = getServerSupabaseConfig();
    const resendKey = process.env["RESEND_API_KEY"];
    const from =
      process.env["RESEND_FROM_EMAIL"] ||
      "The Free School Foundation <notifications@updates.thefreeschoolfoundation.com.ng>";
    const replyTo = process.env["RESEND_REPLY_TO"] || "info@thefreeschoolfoundation.com.ng";
    const appBaseUrl = process.env["APP_BASE_URL"] || "https://thefreeschoolfoundation.com.ng";
    if (!resendKey) throw new Error("Platform email is not configured.");

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(data.accessToken);
    if (userError || !userData.user) throw new Error("Your session has expired.");

    const { data: applications, error: applicationsError } = await supabase
      .from("applications")
      .select(
        "id,applicant_id,campaign_id,application_number,status,version,personal,programmes(name)",
      )
      .in("id", data.applicationIds);
    if (applicationsError || !applications || applications.length !== data.applicationIds.length)
      throw new Error("Email recipients could not be authorized.");

    if (data.event === "submitted") {
      if (
        applications.some(
          (application) =>
            application.applicant_id !== userData.user.id || application.status === "draft",
        )
      )
        throw new Error("Email action not allowed.");
    } else {
      const permission =
        data.event === "message"
          ? "send_communications"
          : data.event === "document_request"
            ? "request_documents"
            : "review_applications";
      for (const campaignId of new Set(applications.map((item) => item.campaign_id))) {
        const { data: allowed, error: permissionError } = await supabase.rpc(
          "has_staff_permission",
          { permission, target_campaign_id: campaignId },
        );
        if (permissionError || !allowed) throw new Error("Email action not allowed.");
      }
    }

    const portalUrl = `${appBaseUrl.replace(/\/$/, "")}/portal`;
    const emails = applications.map((application) => {
      const personal = application.personal as Record<string, unknown>;
      const to = String(personal["email"] ?? "")
        .trim()
        .toLowerCase();
      if (!z.string().email().safeParse(to).success)
        throw new Error("An applicant email is invalid.");
      const content = buildPlatformEmail({
        event: data.event,
        firstName: String(personal["firstName"] ?? ""),
        ...(application.application_number
          ? { applicationNumber: application.application_number }
          : {}),
        status: application.status,
        ...(data.subject ? { subject: data.subject } : {}),
        ...(data.body ? { body: data.body } : {}),
        portalUrl,
      });
      return {
        from,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "category", value: `application_${data.event}` },
          { name: "status", value: application.status },
        ],
      };
    });

    const identity = applications
      .map((application) => `${application.id}-${application.status}-${application.version}`)
      .sort()
      .join("_");
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${identity}-${data.subject ?? ""}-${data.body ?? ""}`),
        ),
      ),
    )
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 40);
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `fsf-${data.event}-${digest}`,
      },
      body: JSON.stringify(emails),
    });
    if (!response.ok) throw new Error("Resend could not deliver the platform email.");
    return { sent: emails.length };
  });

export async function sendPlatformEmail(input: {
  applicationIds: string[];
  event: PlatformEmailEvent;
  subject?: string;
  body?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  let sent = 0;
  for (let start = 0; start < input.applicationIds.length; start += 100) {
    const result = await sendPlatformEmailBatch({
      data: {
        accessToken,
        applicationIds: input.applicationIds.slice(start, start + 100),
        event: input.event,
        ...(input.subject ? { subject: input.subject } : {}),
        ...(input.body ? { body: input.body } : {}),
      },
    });
    sent += result.sent;
  }
  return sent;
}
