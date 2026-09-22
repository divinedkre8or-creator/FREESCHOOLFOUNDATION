import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { buildPlatformEmail } from "./templates";
import type { PlatformEmailEvent } from "./templates";

function getResendConfig() {
  const resendKey = process.env["RESEND_API_KEY"];
  const from =
    process.env["RESEND_FROM_EMAIL"] ||
    "The Free School Foundation <notifications@updates.thefreeschoolfoundation.com.ng>";
  const replyTo =
    process.env["RESEND_REPLY_TO"] || "info@thefreeschoolfoundation.com.ng";
  const appBaseUrl =
    process.env["APP_BASE_URL"] || "https://thefreeschoolfoundation.com.ng";

  if (!resendKey) {
    console.warn(
      "[platform-email] RESEND_API_KEY is not set in process.env. " +
        "Email delivery will fail. Set it in .env.local (dev) or Vercel Environment Variables (prod).",
    );
  }

  return { resendKey, from, replyTo, appBaseUrl };
}

const inputSchema = z.object({
  accessToken: z.string().min(20),
  applicationIds: z.array(z.string().uuid()).min(1).max(100),
  event: z.enum(["submitted", "status", "document_request", "message", "reminder"]),
  subject: z.string().trim().max(180).optional(),
  body: z.string().trim().max(5000).optional(),
});

const sendPlatformEmailBatch = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { url: supabaseUrl, publishableKey } = getServerSupabaseConfig();
    const { resendKey, from, replyTo, appBaseUrl } = getResendConfig();
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

const registeredUsersEmailSchema = z.object({
  accessToken: z.string().min(20),
  userIds: z.array(z.string().uuid()).min(1).max(100),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(5000),
  actionUrl: z.string().trim().url().optional(),
  actionText: z.string().trim().max(50).optional(),
});

const sendRegisteredUsersEmailBatch = createServerFn({ method: "POST" })
  .validator(registeredUsersEmailSchema)
  .handler(async ({ data }) => {
    const { url: supabaseUrl, publishableKey } = getServerSupabaseConfig();
    const { resendKey, from, replyTo, appBaseUrl } = getResendConfig();
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!resendKey) throw new Error("Platform email is not configured.");

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(data.accessToken);
    if (userError || !userData.user) throw new Error("Your session has expired.");

    // Check staff permissions
    const isSuperAdmin =
      userData.user.email === "officialnwachukwudivine@gmail.com" ||
      userData.user.email?.endsWith("@thefreeschoolfoundation.com.ng");

    if (!isSuperAdmin) {
      const { data: allowed, error: permissionError } = await supabase.rpc(
        "has_staff_permission",
        { permission: "send_communications", target_campaign_id: null },
      );
      if (permissionError || !allowed)
        throw new Error("Staff permission required to send communications.");
    }

    let recipientUsers: Array<{ id: string; email: string; firstName?: string | undefined }> = [];

    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, first_name")
        .in("user_id", data.userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.first_name]));

      for (const uid of data.userIds) {
        const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById(uid);
        if (!authErr && authUser?.user?.email) {
          const meta = authUser.user.user_metadata || {};
          recipientUsers.push({
            id: uid,
            email: authUser.user.email,
            firstName:
              profileMap.get(uid) ||
              (meta["first_name"] as string) ||
              (meta["firstName"] as string) ||
              undefined,
          });
        }
      }
    } else {
      const { data: users, error: listError } = await supabase.rpc("list_registered_users");
      if (listError || !users) throw new Error("Could not resolve registered user recipients.");
      const requestedSet = new Set(data.userIds);
      recipientUsers = (users as Array<Record<string, unknown>>)
        .filter((u) => requestedSet.has(String(u["user_id"])) && u["email"])
        .map((u) => ({
          id: String(u["user_id"]),
          email: String(u["email"]),
          firstName: u["first_name"] ? String(u["first_name"]) : undefined,
        }));
    }

    if (recipientUsers.length === 0) {
      throw new Error("No valid registered user email recipients found.");
    }

    const portalUrl = `${appBaseUrl.replace(/\/$/, "")}/portal`;
    const actionUrl = data.actionUrl || `${appBaseUrl.replace(/\/$/, "")}/apply`;
    const actionText = data.actionText || "Complete scholarship application";

    const emails = recipientUsers.map((user) => {
      const to = user.email.trim().toLowerCase();
      if (!z.string().email().safeParse(to).success)
        throw new Error(`Invalid email address: ${to}`);

      const content = buildPlatformEmail({
        event: "reminder",
        firstName: user.firstName,
        subject: data.subject,
        body: data.body,
        portalUrl,
        actionUrl,
        actionText,
      });

      return {
        from,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [{ name: "category", value: "registered_user_reminder" }],
      };
    });

    const identity = recipientUsers
      .map((u) => u.id)
      .sort()
      .join("_");
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${identity}-${data.subject}-${data.body}`),
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
        "Idempotency-Key": `fsf-reminder-${digest}`,
      },
      body: JSON.stringify(emails),
    });

    if (!response.ok) throw new Error("Resend could not deliver the reminder emails.");
    return { sent: emails.length };
  });

export async function sendRegisteredUsersEmail(input: {
  userIds: string[];
  subject: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  let sent = 0;
  for (let start = 0; start < input.userIds.length; start += 100) {
    const result = await sendRegisteredUsersEmailBatch({
      data: {
        accessToken,
        userIds: input.userIds.slice(start, start + 100),
        subject: input.subject,
        body: input.body,
        ...(input.actionUrl ? { actionUrl: input.actionUrl } : {}),
        ...(input.actionText ? { actionText: input.actionText } : {}),
      },
    });
    sent += result.sent;
  }
  return sent;
}

