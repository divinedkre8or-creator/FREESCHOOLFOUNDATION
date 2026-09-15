import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const deleteInputSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
});

export const deleteApplicationRecordServerFn = createServerFn({ method: "POST" })
  .validator(deleteInputSchema)
  .handler(async ({ data }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      "https://amzcvuknjtpsrktkdhcf.supabase.co";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const publishableKey =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      "sb_publishable_kUZnrUmMLb1lDBpNI9bBUg_lCaTDhXA";

    if (!serviceRoleKey) {
      throw new Error("Server service role key is not configured.");
    }

    // 1. Verify user session and permissions
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(data.accessToken);
    if (userError || !userData.user) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    // Check staff permissions
    const { data: hasReviewPermission } = await userClient.rpc("has_staff_permission", {
      permission: "review_applications",
      target_campaign_id: null,
    });
    const { data: hasStaffPermission } = await userClient.rpc("has_staff_permission", {
      permission: "manage_staff",
      target_campaign_id: null,
    });

    if (!hasReviewPermission && !hasStaffPermission) {
      throw new Error("You do not have administrative permission to delete applicant records.");
    }

    // 2. Use admin client for full cascading cleanup & counter update
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch target application details
    const { data: app, error: appError } = await adminClient
      .from("applications")
      .select("id, application_number, campaign_id, applicant_id, application_documents(storage_path)")
      .eq("id", data.applicationId)
      .single();

    if (appError || !app) {
      throw new Error("Application record not found.");
    }

    // 3. Clean up any uploaded storage files
    const docs = (app.application_documents ?? []) as Array<{ storage_path?: string }>;
    const storagePaths = docs
      .map((d) => d.storage_path)
      .filter((p): p is string => Boolean(p && p.trim()));

    if (storagePaths.length > 0) {
      await adminClient.storage.from("application-documents").remove(storagePaths);
    }

    // 4. Delete the application record (cascades to documents, status history, notes, message recipients)
    const { error: deleteError } = await adminClient
      .from("applications")
      .delete()
      .eq("id", data.applicationId);

    if (deleteError) {
      console.error("Delete application error:", deleteError);
      throw new Error("Failed to delete application record: " + deleteError.message);
    }

    // 5. Update / reset sequence counter so the application number is freed up
    const deletedAppNumber = app.application_number;
    if (deletedAppNumber && deletedAppNumber.startsWith("FSF-")) {
      const parts = deletedAppNumber.split("-");
      const appYear = parts[1] ? parseInt(parts[1], 10) : 2026;

      // Find highest remaining application sequence for this year
      const { data: remainingApps } = await adminClient
        .from("applications")
        .select("application_number")
        .like("application_number", `FSF-${appYear}-%`);

      let maxSeq = 0;
      if (remainingApps && remainingApps.length > 0) {
        for (const rem of remainingApps) {
          if (rem.application_number) {
            const seqStr = rem.application_number.split("-")[2];
            const seqNum = parseInt(seqStr, 10);
            if (!isNaN(seqNum) && seqNum > maxSeq) {
              maxSeq = seqNum;
            }
          }
        }
      }

      await adminClient
        .from("application_number_counters")
        .upsert({ year: appYear, last_value: maxSeq }, { onConflict: "year" });
    }

    // 6. Log audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "application.deleted",
      object_type: "application",
      object_id: data.applicationId,
      outcome: "success",
      metadata: {
        application_number: deletedAppNumber,
        applicant_id: app.applicant_id,
      },
    });

    return {
      success: true,
      deletedApplicationNumber: deletedAppNumber,
    };
  });

export async function deleteApplicationRecord(applicationId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await deleteApplicationRecordServerFn({
    data: {
      accessToken,
      applicationId,
    },
  });
}
