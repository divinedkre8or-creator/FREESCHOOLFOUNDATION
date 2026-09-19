import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import type { Application, ApplicationStatus } from "@/lib/fsf";
import type { RegisteredUser } from "@/lib/supabase/applications";

const deleteInputSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
});

const tokenOnlySchema = z.object({
  accessToken: z.string().min(20),
});

const updateStatusSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  status: z.string().min(2),
  applicantMessage: z.string().optional(),
  internalReason: z.string().optional(),
});

const updateDocStatusSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  documentId: z.string().uuid(),
  scanStatus: z.enum(["clean", "rejected", "pending"]),
  note: z.string().optional(),
});

const addNoteSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  noteBody: z.string().min(1),
});

const requestDocSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  documentType: z.string().min(2),
  reason: z.string().optional(),
});

const dispatchMessageSchema = z.object({
  accessToken: z.string().min(20),
  applicationIds: z.array(z.string().uuid()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  priority: z.enum(["normal", "high"]).default("normal"),
});

// Helper to verify staff authorization and return clients
async function verifyStaffAndGetClients(accessToken: string) {
  const { url: supabaseUrl } = getServerSupabaseConfig();
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!serviceRoleKey) {
    throw new Error("Server service role key is not configured.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  // Verify staff role
  const { data: staffProfile } = await adminClient
    .from("staff_profiles")
    .select("role, permissions, active")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .maybeSingle();

  const isSuperAdminEmail =
    userData.user.email === "officialnwachukwudivine@gmail.com" ||
    userData.user.email?.endsWith("@thefreeschoolfoundation.com.ng");

  if (!staffProfile && !isSuperAdminEmail) {
    throw new Error("You do not have staff permission to perform this action.");
  }

  return { userData, adminClient, staffProfile };
}

// 1. Fetch All Registered Users (Direct from auth.users joined with apps & profiles)
export const getRegisteredUsersServerFn = createServerFn({ method: "POST" })
  .validator(tokenOnlySchema)
  .handler(async ({ data }): Promise<RegisteredUser[]> => {
    const { adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // List all users from auth.users (supports up to 1000)
    const { data: authUsersData, error: authUsersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authUsersError) {
      console.error("Failed to list auth users:", authUsersError);
      throw new Error("Failed to load registered users.");
    }

    const authUsers = authUsersData?.users ?? [];

    // Fetch all applications
    const { data: apps } = await adminClient
      .from("applications")
      .select("id, applicant_id, status, application_number, level, personal, created_at, programmes(name)")
      .order("created_at", { ascending: false });

    // Fetch all profiles
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, first_name, last_name, phone");

    const profileMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    (profiles ?? []).forEach((p) => {
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    const appMap = new Map<string, Record<string, unknown>>();
    (apps ?? []).forEach((app) => {
      if (app.applicant_id) {
        appMap.set(String(app.applicant_id), app as unknown as Record<string, unknown>);
      }
    });

    const results: RegisteredUser[] = authUsers.map((u) => {
      const app = appMap.get(u.id);
      const prof = profileMap.get(u.id);
      const personal = (app?.["personal"] || {}) as Record<string, string>;
      const prog = app?.["programmes"] as { name?: string } | null;

      const firstName = personal["firstName"] || prof?.first_name || (u.user_metadata?.["firstName"] as string) || null;
      const lastName = personal["lastName"] || prof?.last_name || (u.user_metadata?.["lastName"] as string) || null;
      const phone = personal["phone"] || prof?.phone || (u.user_metadata?.["phone"] as string) || null;

      return {
        userId: u.id,
        email: u.email ?? "",
        firstName,
        lastName,
        phone,
        emailConfirmed: Boolean(u.email_confirmed_at),
        hasApplication: Boolean(app),
        applicationId: app?.["id"] ? String(app["id"]) : null,
        applicationNumber: app?.["application_number"] ? String(app["application_number"]) : null,
        applicationStatus: app ? String(app["status"]) : "registered_only",
        applicationLevel: app?.["level"] ? String(app["level"]) : null,
        programmeName: prog?.name || null,
        registeredAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
      };
    });

    // Sort newest registration first
    results.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
    return results;
  });

// 2. Fetch All Applications (Full dossier records)
export const getAdminApplicationsServerFn = createServerFn({ method: "POST" })
  .validator(tokenOnlySchema)
  .handler(async ({ data }) => {
    const { adminClient } = await verifyStaffAndGetClients(data.accessToken);

    const { data: rows, error } = await adminClient
      .from("applications")
      .select(`
        id,
        application_number,
        applicant_id,
        campaign_id,
        programme_id,
        level,
        status,
        current_step,
        personal,
        education,
        scholarship_responses,
        communication_consent,
        declaration_accepted_at,
        submitted_at,
        created_at,
        updated_at,
        programmes (
          id,
          name,
          slug
        ),
        application_documents (
          id,
          document_type,
          display_name,
          storage_path,
          mime_type,
          size_bytes,
          scan_status,
          uploaded_at,
          requested_at
        ),
        application_status_history (
          id,
          from_status,
          to_status,
          applicant_message,
          internal_reason,
          created_at
        ),
        internal_notes (
          id,
          author_id,
          body,
          created_at
        ),
        message_recipients (
          message_id,
          read_at,
          messages (
            id,
            subject,
            body,
            created_at
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin applications query error:", error);
      throw new Error("Failed to load applications.");
    }

    return rows ?? [];
  });

// 3. Update Application Status
export const updateApplicationStatusServerFn = createServerFn({ method: "POST" })
  .validator(updateStatusSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // Get current status
    const { data: app, error: appError } = await adminClient
      .from("applications")
      .select("id, status, application_number, applicant_id, personal")
      .eq("id", data.applicationId)
      .single();

    if (appError || !app) {
      throw new Error("Application not found.");
    }

    const fromStatus = app.status;
    const toStatus = data.status.toLowerCase().replace(/\s+/g, "_");

    // Update application
    const { error: updateError } = await adminClient
      .from("applications")
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.applicationId);

    if (updateError) {
      console.error("Status update error:", updateError);
      throw new Error("Failed to update application status.");
    }

    // Record status history
    await adminClient.from("application_status_history").insert({
      application_id: data.applicationId,
      actor_id: userData.user.id,
      from_status: fromStatus,
      to_status: toStatus,
      applicant_message: data.applicantMessage || null,
      internal_reason: data.internalReason || null,
    });

    // Record audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "application.status_changed",
      object_type: "application",
      object_id: data.applicationId,
      outcome: "success",
      metadata: {
        from_status: fromStatus,
        to_status: toStatus,
        applicant_message: data.applicantMessage,
      },
    });

    return { success: true, newStatus: toStatus };
  });

// 4. Update Document Verification / Scrutiny Status
export const updateDocumentStatusServerFn = createServerFn({ method: "POST" })
  .validator(updateDocStatusSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    const { data: doc, error: docError } = await adminClient
      .from("application_documents")
      .select("id, display_name, document_type, scan_status")
      .eq("id", data.documentId)
      .single();

    if (docError || !doc) {
      throw new Error("Document not found.");
    }

    // Update document scan_status
    const { error: updateError } = await adminClient
      .from("application_documents")
      .update({
        scan_status: data.scanStatus,
      })
      .eq("id", data.documentId);

    if (updateError) {
      throw new Error("Failed to update document status.");
    }

    // Record internal note if provided
    const noteText = data.note?.trim() || `Document "${doc.display_name || doc.document_type}" verified and marked as ${data.scanStatus.toUpperCase()} by staff.`;
    await adminClient.from("internal_notes").insert({
      application_id: data.applicationId,
      author_id: userData.user.id,
      body: noteText,
    });

    // Record audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "document.status_verified",
      object_type: "application_document",
      object_id: data.documentId,
      outcome: "success",
      metadata: {
        previous_status: doc.scan_status,
        new_status: data.scanStatus,
      },
    });

    return { success: true, documentId: data.documentId, newStatus: data.scanStatus };
  });

// 5. Add Internal Note
export const addApplicationNoteServerFn = createServerFn({ method: "POST" })
  .validator(addNoteSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    const { error } = await adminClient.from("internal_notes").insert({
      application_id: data.applicationId,
      author_id: userData.user.id,
      body: data.noteBody,
    });

    if (error) {
      console.error("Add note error:", error);
      throw new Error("Failed to save internal note.");
    }

    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "note.created",
      object_type: "application",
      object_id: data.applicationId,
      outcome: "success",
    });

    return { success: true };
  });

// 6. Request Application Document
export const requestApplicationDocumentServerFn = createServerFn({ method: "POST" })
  .validator(requestDocSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    const { error } = await adminClient.from("application_documents").insert({
      application_id: data.applicationId,
      document_type: data.documentType,
      display_name: data.documentType,
      requested_at: new Date().toISOString(),
      scan_status: "pending",
    });

    if (error) {
      console.error("Request document error:", error);
      throw new Error("Failed to create document request.");
    }

    // Set application status to additional_documents_required if not already
    await adminClient
      .from("applications")
      .update({
        status: "additional_documents_required",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.applicationId);

    // Record audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "document.requested",
      object_type: "application",
      object_id: data.applicationId,
      outcome: "success",
      metadata: { requested_type: data.documentType },
    });

    return { success: true };
  });

// 7. Dispatch Portal Message
export const dispatchPortalMessageServerFn = createServerFn({ method: "POST" })
  .validator(dispatchMessageSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // Create message
    const { data: message, error: messageError } = await adminClient
      .from("messages")
      .insert({
        author_id: userData.user.id,
        subject: data.subject,
        body: data.body,
        priority: data.priority,
      })
      .select("id")
      .single();

    if (messageError || !message) {
      console.error("Message insert error:", messageError);
      throw new Error("Failed to dispatch portal message.");
    }

    // Link recipients
    const recipients = data.applicationIds.map((appId) => ({
      message_id: message.id,
      applicant_id: appId,
      delivery_status: "sent",
    }));

    const { error: recipientError } = await adminClient
      .from("message_recipients")
      .insert(recipients);

    if (recipientError) {
      console.error("Recipient insert error:", recipientError);
      throw new Error("Failed to attach message recipients.");
    }

    return { success: true, count: data.applicationIds.length };
  });

// 8. Delete Application Record
export const deleteApplicationRecordServerFn = createServerFn({ method: "POST" })
  .validator(deleteInputSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // Fetch target application details
    const { data: app, error: appError } = await adminClient
      .from("applications")
      .select(
        "id, application_number, campaign_id, applicant_id, application_documents(storage_path)",
      )
      .eq("id", data.applicationId)
      .single();

    if (appError || !app) {
      throw new Error("Application record not found.");
    }

    // Clean up any uploaded storage files
    const docs = (app.application_documents ?? []) as Array<{ storage_path?: string }>;
    const storagePaths = docs
      .map((d) => d.storage_path)
      .filter((p): p is string => Boolean(p && p.trim()));

    if (storagePaths.length > 0) {
      await adminClient.storage.from("application-documents").remove(storagePaths);
    }

    // Delete the application record (cascades to documents, status history, notes, message recipients)
    const { error: deleteError } = await adminClient
      .from("applications")
      .delete()
      .eq("id", data.applicationId);

    if (deleteError) {
      console.error("Delete application error:", deleteError);
      throw new Error("Failed to delete application record: " + deleteError.message);
    }

    // Update / reset sequence counter
    const deletedAppNumber = app.application_number;
    if (deletedAppNumber && deletedAppNumber.startsWith("FSF-")) {
      const parts = deletedAppNumber.split("-");
      const appYear = parts[1] ? parseInt(parts[1], 10) : 2026;

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

    // Log audit event
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

// Client wrappers
export async function deleteApplicationRecord(applicationId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await deleteApplicationRecordServerFn({
    data: { accessToken, applicationId },
  });
}

export async function adminUpdateApplicationStatus(
  applicationId: string,
  status: string,
  applicantMessage?: string,
) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await updateApplicationStatusServerFn({
    data: { accessToken, applicationId, status, applicantMessage },
  });
}

export async function adminUpdateDocumentStatus(
  applicationId: string,
  documentId: string,
  scanStatus: "clean" | "rejected" | "pending",
  note?: string,
) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await updateDocumentStatusServerFn({
    data: { accessToken, applicationId, documentId, scanStatus, note },
  });
}

export async function adminAddApplicationNote(applicationId: string, noteBody: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await addApplicationNoteServerFn({
    data: { accessToken, applicationId, noteBody },
  });
}

export async function adminRequestApplicationDocument(applicationId: string, documentType: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await requestApplicationDocumentServerFn({
    data: { accessToken, applicationId, documentType },
  });
}

export async function adminDispatchPortalMessage(input: {
  applicationIds: string[];
  subject: string;
  body: string;
  priority?: "normal" | "high";
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await dispatchPortalMessageServerFn({
    data: {
      accessToken,
      applicationIds: input.applicationIds,
      subject: input.subject,
      body: input.body,
      priority: input.priority || "normal",
    },
  });
}
