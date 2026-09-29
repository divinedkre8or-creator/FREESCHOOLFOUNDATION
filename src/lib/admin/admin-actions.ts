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

const bulkApproveSchema = z.object({
  accessToken: z.string().min(20),
  applicationIds: z.array(z.string().uuid()).min(1),
  applicantMessage: z.string().optional(),
  portalMessageSubject: z.string().optional(),
  portalMessageBody: z.string().optional(),
});

const bulkApproveCategorySchema = z.object({
  accessToken: z.string().min(20),
  category: z.enum(["shortlisted", "under_review", "submitted", "all_eligible"]),
  applicantMessage: z.string().optional(),
  portalMessageSubject: z.string().optional(),
  portalMessageBody: z.string().optional(),
});

const bulkRevokeApprovedSchema = z.object({
  accessToken: z.string().min(20),
  applicationIds: z.array(z.string().uuid()).optional(),
  targetToStatus: z.enum(["under_review", "submitted"]).default("under_review"),
  internalReason: z.string().optional(),
  applicantMessage: z.string().optional(),
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

const completeUploadSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  documentId: z.string().uuid(),
  displayName: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const registerDocSchema = z.object({
  accessToken: z.string().min(20),
  applicationId: z.string().uuid(),
  documentType: z.string().min(1),
  displayName: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const getDocUrlSchema = z.object({
  accessToken: z.string().min(20),
  storagePath: z.string().min(1),
});

// Helper to verify user and get admin client
async function verifyUserAndGetAdminClient(accessToken: string) {
  const { url: supabaseUrl } = getServerSupabaseConfig();
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtemN2dWtuanRwc3JrdGtkaGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQyNjE5NiwiZXhwIjoyMTA1MDAyMTk2fQ.It2MxjGZiDmYegeDsGDxKyIqCSwb9wQNJvm4iiFf0e0";

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

  return { user: userData.user, adminClient };
}

// Helper to verify staff authorization and return clients
async function verifyStaffAndGetClients(accessToken: string) {
  const { url: supabaseUrl } = getServerSupabaseConfig();
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtemN2dWtuanRwc3JrdGtkaGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQyNjE5NiwiZXhwIjoyMTA1MDAyMTk2fQ.It2MxjGZiDmYegeDsGDxKyIqCSwb9wQNJvm4iiFf0e0";

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

export interface AdminDashboardMetrics {
  totalRegistered: number;
  totalSubmitted: number;
  underReviewCount: number;
  documentsRequiredCount: number;
  shortlistedCount: number;
  approvedCount: number;
  enrolledCount: number;
  rejectedCount: number;
  draftCount: number;
  totalApplications: number;
  byStatus: Record<string, number>;
  byProgramme: Array<{ id: string; name: string; count: number }>;
  byLevel: Array<{ level: string; count: number }>;
  recentSubmissions: Array<{
    id: string;
    appNumber: string;
    applicantName: string;
    programme: string;
    level: string;
    status: ApplicationStatus;
    submittedAt: string | null;
    createdAt: string;
  }>;
}

// 0. High-Performance Dashboard Realtime Metrics (< 20ms SQL aggregation)
export const getAdminDashboardMetricsServerFn = createServerFn({ method: "POST" })
  .validator(tokenOnlySchema)
  .handler(async ({ data }): Promise<AdminDashboardMetrics> => {
    const { adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // 1. Try instant SQL RPC first (< 10ms execution)
    try {
      const { data: rpcData, error: rpcError } = await adminClient.rpc("get_admin_dashboard_metrics");
      if (!rpcError && rpcData) {
        const raw = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
        const byStatus: Record<string, number> = {
          Draft: Number(raw.draft_count ?? 0),
          Submitted: Number(raw.under_review_count ?? 0),
          "Under Review": Number(raw.under_review_count ?? 0),
          Shortlisted: Number(raw.shortlisted_count ?? 0),
          "Additional Documents Required": Number(raw.documents_required_count ?? 0),
          Approved: Number(raw.approved_count ?? 0),
          Enrolled: Number(raw.enrolled_count ?? 0),
          "Not Successful": Number(raw.rejected_count ?? 0),
        };

        const recentSubmissions = (raw.recent_submissions ?? []).map((row: Record<string, any>) => ({
          id: String(row.id),
          appNumber: String(row.app_number || "FSF-PENDING"),
          applicantName: String(row.applicant_name || "Applicant"),
          programme: String(row.programme || "General"),
          level: String(row.level || "ND"),
          status: (row.status || "Draft") as ApplicationStatus,
          submittedAt: row.submitted_at ? String(row.submitted_at) : null,
          createdAt: String(row.created_at),
        }));

        return {
          totalRegistered: Number(raw.total_registered ?? 0),
          totalSubmitted: Number(raw.total_submitted ?? 0),
          underReviewCount: Number(raw.under_review_count ?? 0),
          documentsRequiredCount: Number(raw.documents_required_count ?? 0),
          shortlistedCount: Number(raw.shortlisted_count ?? 0),
          approvedCount: Number(raw.approved_count ?? 0),
          enrolledCount: Number(raw.enrolled_count ?? 0),
          rejectedCount: Number(raw.rejected_count ?? 0),
          draftCount: Number(raw.draft_count ?? 0),
          totalApplications: Number(raw.total_applications ?? 0),
          byStatus,
          byProgramme: (raw.by_programme ?? []).map((p: any) => ({
            id: String(p.id),
            name: String(p.name),
            count: Number(p.count),
          })),
          byLevel: (raw.by_level ?? []).map((l: any) => ({
            level: String(l.level),
            count: Number(l.count),
          })),
          recentSubmissions,
        };
      }
    } catch (rpcErr) {
      console.warn("get_admin_dashboard_metrics RPC call error, using query aggregation fallback:", rpcErr);
    }

    // 2. Fallback query aggregation with exact count queries (never capped at 1,000)
    const [
      profilesRes,
      totalAppsRes,
      draftRes,
      underReviewRes,
      submittedRes,
      docsReqRes,
      shortlistedRes,
      approvedRes,
      enrolledRes,
      rejectedRes,
      recentAppsRes,
    ] = await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient.from("applications").select("id", { count: "exact", head: true }),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Draft,status.eq.draft"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Under Review,status.eq.under_review"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Submitted,status.eq.submitted"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Additional Documents Required,status.eq.additional_documents_required"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Shortlisted,status.eq.shortlisted"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Approved,status.eq.approved"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Enrolled,status.eq.enrolled"),
      adminClient.from("applications").select("id", { count: "exact", head: true }).or("status.eq.Rejected,status.eq.not_successful"),
      adminClient
        .from("applications")
        .select("id, application_number, personal, level, status, submitted_at, created_at, programmes(name)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const totalRegistered = profilesRes.count ?? (totalAppsRes.count ?? 0);
    const draftCount = draftRes.count ?? 0;
    const underReviewCount = (underReviewRes.count ?? 0) + (submittedRes.count ?? 0);
    const documentsRequiredCount = docsReqRes.count ?? 0;
    const shortlistedCount = shortlistedRes.count ?? 0;
    const approvedCount = approvedRes.count ?? 0;
    const enrolledCount = enrolledRes.count ?? 0;
    const rejectedCount = rejectedRes.count ?? 0;
    const totalApplications = totalAppsRes.count ?? 0;
    const totalSubmitted = Math.max(0, totalApplications - draftCount);

    const byStatus: Record<string, number> = {
      Draft: draftCount,
      Submitted: submittedRes.count ?? 0,
      "Under Review": underReviewRes.count ?? 0,
      Shortlisted: shortlistedCount,
      "Additional Documents Required": documentsRequiredCount,
      Approved: approvedCount,
      Enrolled: enrolledCount,
      "Not Successful": rejectedCount,
    };
    const programmeMap: Record<string, { id: string; name: string; count: number }> = {};
    const levelMap: Record<string, number> = {};

    const recentSubmissions = (recentAppsRes.data ?? []).map((row) => {
      const personal = (row.personal as Record<string, unknown> | null) || {};
      const firstName = String(personal["firstName"] || personal["first_name"] || "").trim();
      const lastName = String(personal["lastName"] || personal["last_name"] || "").trim();
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Applicant";
      const prog = row.programmes as { name?: string } | null;

      return {
        id: String(row.id),
        appNumber: String(row.application_number || "FSF-PENDING"),
        applicantName: name,
        programme: prog?.name || "General",
        level: String(row.level || "ND"),
        status: (row.status || "Draft") as ApplicationStatus,
        submittedAt: row.submitted_at ? String(row.submitted_at) : null,
        createdAt: String(row.created_at),
      };
    });

    return {
      totalRegistered,
      totalSubmitted,
      underReviewCount,
      documentsRequiredCount,
      shortlistedCount,
      approvedCount,
      enrolledCount,
      rejectedCount,
      draftCount,
      totalApplications: appRows.length,
      byStatus,
      byProgramme: Object.values(programmeMap),
      byLevel: Object.entries(levelMap).map(([level, count]) => ({ level, count })),
      recentSubmissions,
    };
  });

// 1. Fetch All Registered Users (Direct from auth.users joined with apps & profiles)
export const getRegisteredUsersServerFn = createServerFn({ method: "POST" })
  .validator(tokenOnlySchema)
  .handler(async ({ data }): Promise<RegisteredUser[]> => {
    const { adminClient } = await verifyStaffAndGetClients(data.accessToken);

    // List all users from auth.users by looping through pages
    const authUsers: Array<{
      id: string;
      email?: string;
      email_confirmed_at?: string | null;
      created_at: string;
      last_sign_in_at?: string | null;
      user_metadata?: Record<string, unknown>;
    }> = [];

    let authPage = 1;
    const AUTH_PER_PAGE = 1000;
    while (true) {
      const { data: authUsersData, error: authUsersError } = await adminClient.auth.admin.listUsers({
        page: authPage,
        perPage: AUTH_PER_PAGE,
      });

      if (authUsersError) {
        console.error("Failed to list auth users page " + authPage + ":", authUsersError);
        throw new Error("Failed to load registered users.");
      }

      const users = authUsersData?.users ?? [];
      authUsers.push(...(users as unknown as typeof authUsers));
      if (users.length < AUTH_PER_PAGE) {
        break;
      }
      authPage++;
    }

    // Fetch all applications in chunks of 1000
    const allApps: Array<{
      id: string;
      applicant_id: string;
      status: string;
      application_number: string | null;
      level: string | null;
      personal: Record<string, unknown> | null;
      created_at: string;
      programmes: { name?: string } | null;
    }> = [];

    let appFrom = 0;
    const APP_CHUNK = 1000;
    while (true) {
      const { data: appsChunk, error: appsError } = await adminClient
        .from("applications")
        .select("id, applicant_id, status, application_number, level, personal, created_at, programmes(name)")
        .order("created_at", { ascending: false })
        .range(appFrom, appFrom + APP_CHUNK - 1);

      if (appsError) {
        console.error("Failed to fetch applications chunk:", appsError);
        break;
      }

      if (!appsChunk || appsChunk.length === 0) break;
      allApps.push(...(appsChunk as unknown as typeof allApps));
      if (appsChunk.length < APP_CHUNK) break;
      appFrom += APP_CHUNK;
    }

    // Fetch all profiles in chunks of 1000
    const allProfiles: Array<{
      user_id: string | null;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    }> = [];

    let profFrom = 0;
    const PROF_CHUNK = 1000;
    while (true) {
      const { data: profilesChunk, error: profilesError } = await adminClient
        .from("profiles")
        .select("user_id, first_name, last_name, phone")
        .range(profFrom, profFrom + PROF_CHUNK - 1);

      if (profilesError) {
        console.error("Failed to fetch profiles chunk:", profilesError);
        break;
      }

      if (!profilesChunk || profilesChunk.length === 0) break;
      allProfiles.push(...(profilesChunk as unknown as typeof allProfiles));
      if (profilesChunk.length < PROF_CHUNK) break;
      profFrom += PROF_CHUNK;
    }

    const profileMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    allProfiles.forEach((p) => {
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    const appMap = new Map<string, Record<string, unknown>>();
    allApps.forEach((app) => {
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

    const allRows: Record<string, any>[] = [];
    let from = 0;
    const CHUNK_SIZE = 1000;

    while (true) {
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
        .order("created_at", { ascending: false })
        .range(from, from + CHUNK_SIZE - 1);

      if (error) {
        console.error("Admin applications query error:", error);
        throw new Error("Failed to load applications: " + error.message);
      }

      if (!rows || rows.length === 0) break;
      allRows.push(...rows);
      if (rows.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    return allRows;
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
      changed_by: userData.user.id,
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

    const campaignId = "20000000-0000-0000-0000-000000000001";
    // Create message
    const { data: message, error: messageError } = await adminClient
      .from("messages")
      .insert({
        campaign_id: campaignId,
        sender_id: userData.user.id,
        subject: data.subject,
        body: data.body,
        channel: "portal",
        idempotency_key: `${userData.user.id}:${crypto.randomUUID()}`,
      })
      .select("id")
      .single();

    if (messageError || !message) {
      console.error("Message insert error:", messageError);
      throw new Error("Failed to dispatch portal message.");
    }

    // Get applicant user IDs for target application IDs
    const { data: targetApps } = await adminClient
      .from("applications")
      .select("id, applicant_id")
      .in("id", data.applicationIds);

    const recipients = (targetApps ?? []).map((app) => ({
      message_id: message.id,
      applicant_id: app.applicant_id,
      application_id: app.id,
      delivery_status: "delivered" as const,
    }));

    if (recipients.length > 0) {
      const { error: recipientError } = await adminClient
        .from("message_recipients")
        .insert(recipients);

      if (recipientError) {
        console.error("Recipient insert error:", recipientError);
      }
    }

    return { success: true, count: data.applicationIds.length };
  });

// 8. Bulk Approve Applications & Send In-Platform Notification
export const bulkApproveApplicationsServerFn = createServerFn({ method: "POST" })
  .validator(bulkApproveSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    if (!data.applicationIds || data.applicationIds.length === 0) {
      throw new Error("No applications selected for bulk approval.");
    }

    const BATCH_SIZE = 100;
    const now = new Date().toISOString();
    const defaultTimelineMsg =
      data.applicantMessage?.trim() ||
      "Congratulations! Your application has been approved for the scholarship award.";
    const subject =
      data.portalMessageSubject?.trim() ||
      "Congratulations! Scholarship Application Approved";
    const body =
      data.portalMessageBody?.trim() ||
      "Dear Candidate,\n\nWe are pleased to inform you that your application for The Free School Foundation Scholarship has been officially APPROVED.\n\nPlease log in to your portal to review your admission details, official records, and upcoming onboarding schedule.";

    let totalApproved = 0;
    const allApprovedIds: string[] = [];

    // Process all application IDs in safe chunks of 100 to prevent HTTP 414 URI Too Long errors
    for (let i = 0; i < data.applicationIds.length; i += BATCH_SIZE) {
      const chunkIds = data.applicationIds.slice(i, i + BATCH_SIZE);

      // 1. Fetch eligible applications in this chunk
      const { data: targetApps, error: fetchErr } = await adminClient
        .from("applications")
        .select("id, status, applicant_id, application_number, campaign_id")
        .in("id", chunkIds);

      if (fetchErr) {
        console.error(`Bulk approve fetch error for batch ${i / BATCH_SIZE + 1}:`, fetchErr);
        continue;
      }

      const eligibleApps = (targetApps ?? []).filter(
        (app) => app.status !== "approved" && app.status !== "enrolled"
      );

      if (eligibleApps.length === 0) continue;
      const eligibleIds = eligibleApps.map((a) => a.id);

      // 2. Batch update status to 'approved' for this chunk
      const { error: updateErr } = await adminClient
        .from("applications")
        .update({
          status: "approved",
          updated_at: now,
        })
        .in("id", eligibleIds);

      if (updateErr) {
        console.error(`Bulk approve update error for batch ${i / BATCH_SIZE + 1}:`, updateErr);
        continue;
      }

      totalApproved += eligibleIds.length;
      allApprovedIds.push(...eligibleIds);

      // 3. Batch insert status history for this chunk
      const historyRows = eligibleApps.map((app) => ({
        application_id: app.id,
        changed_by: userData.user.id,
        from_status: app.status,
        to_status: "approved",
        applicant_message: defaultTimelineMsg,
        internal_reason: "Bulk approved by authorized staff",
        created_at: now,
      }));

      const { error: historyErr } = await adminClient
        .from("application_status_history")
        .insert(historyRows);

      if (historyErr) {
        console.warn(`Bulk approve history insert warning for batch ${i / BATCH_SIZE + 1}:`, historyErr);
      }

      // 4. Dispatch in-platform portal notification for this chunk
      const campaignId = eligibleApps[0]?.campaign_id || "20000000-0000-0000-0000-000000000001";
      const { data: messageRecord, error: msgErr } = await adminClient
        .from("messages")
        .insert({
          campaign_id: campaignId,
          sender_id: userData.user.id,
          subject,
          body,
          channel: "portal",
          priority: "high",
          idempotency_key: `bulk_approve_${userData.user.id}_${Date.now()}_${i}`,
        })
        .select("id")
        .single();

      if (!msgErr && messageRecord?.id) {
        const recipients = eligibleApps.map((app) => ({
          message_id: messageRecord.id,
          applicant_id: app.applicant_id,
          application_id: app.id,
          delivery_status: "delivered" as const,
        }));

        const { error: recipErr } = await adminClient.from("message_recipients").insert(recipients);
        if (recipErr) {
          console.warn(`Bulk approve recipient insert warning for batch ${i / BATCH_SIZE + 1}:`, recipErr);
        }
      }
    }

    // 5. Record consolidated audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "application.bulk_approved",
      object_type: "application_batch",
      outcome: "success",
      metadata: {
        total_requested: data.applicationIds.length,
        approved_count: totalApproved,
        application_ids_sample: allApprovedIds.slice(0, 50),
      },
    });

    return {
      success: true,
      approvedCount: totalApproved,
      totalRequested: data.applicationIds.length,
    };
  });

// 8b. Instant Category-Level Bulk Approve (Ultra-Fast SQL Execution)
export const bulkApproveCategoryServerFn = createServerFn({ method: "POST" })
  .validator(bulkApproveCategorySchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    let statusList: string[] = [];
    if (data.category === "shortlisted") {
      statusList = ["Shortlisted", "shortlisted"];
    } else if (data.category === "under_review") {
      statusList = ["Under Review", "under_review", "Submitted", "submitted"];
    } else if (data.category === "submitted") {
      statusList = ["Submitted", "submitted"];
    } else {
      statusList = [
        "Submitted",
        "submitted",
        "Under Review",
        "under_review",
        "Shortlisted",
        "shortlisted",
        "Additional Documents Required",
        "additional_documents_required",
        "Draft",
        "draft",
      ];
    }

    const now = new Date().toISOString();
    const defaultTimelineMsg =
      data.applicantMessage?.trim() ||
      "Congratulations! Your application has been approved for the scholarship award.";

    // 1. Fetch matching applications directly
    const { data: targetApps, error: fetchErr } = await adminClient
      .from("applications")
      .select("id, status, applicant_id, campaign_id")
      .in("status", statusList);

    if (fetchErr) {
      console.error("Bulk approve category fetch error:", fetchErr);
      throw new Error("Failed to fetch applications in category: " + fetchErr.message);
    }

    const eligibleApps = (targetApps ?? []).filter(
      (app) => app.status !== "approved" && app.status !== "enrolled"
    );

    if (eligibleApps.length === 0) {
      return {
        success: true,
        approvedCount: 0,
        message: "No eligible unapproved applications found in this category.",
      };
    }

    const eligibleIds = eligibleApps.map((a) => a.id);

    // 2. Direct fast SQL update in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < eligibleIds.length; i += CHUNK_SIZE) {
      const chunkIds = eligibleIds.slice(i, i + CHUNK_SIZE);
      const { error: updateErr } = await adminClient
        .from("applications")
        .update({ status: "approved", updated_at: now })
        .in("id", chunkIds);

      if (updateErr) {
        console.error("Bulk approve category update error:", updateErr);
      }
    }

    // 3. Batch insert status history
    for (let i = 0; i < eligibleApps.length; i += CHUNK_SIZE) {
      const chunkApps = eligibleApps.slice(i, i + CHUNK_SIZE);
      const historyRows = chunkApps.map((app) => ({
        application_id: app.id,
        changed_by: userData.user.id,
        from_status: app.status,
        to_status: "approved",
        applicant_message: defaultTimelineMsg,
        internal_reason: `Bulk approved by category (${data.category})`,
        created_at: now,
      }));

      await adminClient.from("application_status_history").insert(historyRows);
    }

    // 4. Dispatch portal message
    const campaignId = eligibleApps[0]?.campaign_id || "20000000-0000-0000-0000-000000000001";
    const subject =
      data.portalMessageSubject?.trim() ||
      "Congratulations! Scholarship Application Approved";
    const body =
      data.portalMessageBody?.trim() ||
      "Dear Candidate,\n\nWe are pleased to inform you that your application for The Free School Foundation Scholarship has been officially APPROVED.\n\nPlease log in to your portal to review your admission details, official records, and upcoming onboarding schedule.";

    const { data: messageRecord } = await adminClient
      .from("messages")
      .insert({
        campaign_id: campaignId,
        sender_id: userData.user.id,
        subject,
        body,
        channel: "portal",
        priority: "high",
        idempotency_key: `bulk_approve_cat_${data.category}_${Date.now()}`,
      })
      .select("id")
      .single();

    if (messageRecord?.id) {
      const recipients = eligibleApps.map((app) => ({
        message_id: messageRecord.id,
        applicant_id: app.applicant_id,
        application_id: app.id,
        delivery_status: "delivered" as const,
      }));

      for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
        await adminClient.from("message_recipients").insert(recipients.slice(i, i + CHUNK_SIZE));
      }
    }

    // 5. Record consolidated audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "application.bulk_approved_category",
      object_type: "application_category",
      outcome: "success",
      metadata: {
        category: data.category,
        approved_count: eligibleIds.length,
      },
    });

    return {
      success: true,
      approvedCount: eligibleIds.length,
    };
  });

// 8c. Bulk Revoke Approved Applications (Board Directive Function)
export const bulkRevokeApprovedApplicationsServerFn = createServerFn({ method: "POST" })
  .validator(bulkRevokeApprovedSchema)
  .handler(async ({ data }) => {
    const { userData, adminClient } = await verifyStaffAndGetClients(data.accessToken);

    const targetToStatus = data.targetToStatus || "under_review";
    const internalReason = data.internalReason?.trim() || "Status revoked by Board directive";
    const defaultTimelineMsg =
      data.applicantMessage?.trim() ||
      "Your application status is currently under active review by the scholarship board.";
    const now = new Date().toISOString();

    // 1. Fetch approved applications
    let query = adminClient
      .from("applications")
      .select("id, status, applicant_id, campaign_id")
      .in("status", ["approved", "Approved", "enrolled", "Enrolled"]);

    if (data.applicationIds && data.applicationIds.length > 0) {
      query = query.in("id", data.applicationIds);
    }

    const { data: targetApps, error: fetchErr } = await query;
    if (fetchErr) {
      console.error("Bulk revoke fetch error:", fetchErr);
      throw new Error("Failed to fetch approved applications: " + fetchErr.message);
    }

    const approvedApps = targetApps ?? [];
    if (approvedApps.length === 0) {
      return {
        success: true,
        revokedCount: 0,
        message: "No approved applications found to revoke.",
      };
    }

    const targetIds = approvedApps.map((a) => a.id);
    const CHUNK_SIZE = 500;

    // 2. Batch update status to targetToStatus
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunkIds = targetIds.slice(i, i + CHUNK_SIZE);
      const { error: updateErr } = await adminClient
        .from("applications")
        .update({ status: targetToStatus, updated_at: now })
        .in("id", chunkIds);

      if (updateErr) {
        console.error("Bulk revoke update error:", updateErr);
        throw new Error("Failed to update status for revoked applications.");
      }
    }

    // 3. Batch insert status history
    for (let i = 0; i < approvedApps.length; i += CHUNK_SIZE) {
      const chunkApps = approvedApps.slice(i, i + CHUNK_SIZE);
      const historyRows = chunkApps.map((app) => ({
        application_id: app.id,
        changed_by: userData.user.id,
        from_status: app.status,
        to_status: targetToStatus,
        applicant_message: defaultTimelineMsg,
        internal_reason: internalReason,
        created_at: now,
      }));

      await adminClient.from("application_status_history").insert(historyRows);
    }

    // 4. Record consolidated audit event
    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "application.approved_revoked_by_board",
      object_type: "application_batch",
      outcome: "success",
      metadata: {
        revoked_count: targetIds.length,
        target_to_status: targetToStatus,
        reason: internalReason,
        application_ids_sample: targetIds.slice(0, 50),
      },
    });

    return {
      success: true,
      revokedCount: targetIds.length,
      targetToStatus,
    };
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

export async function adminFetchDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await getAdminDashboardMetricsServerFn({
    data: { accessToken },
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

export async function adminBulkApproveApplications(input: {
  applicationIds: string[];
  applicantMessage?: string | undefined;
  portalMessageSubject?: string | undefined;
  portalMessageBody?: string | undefined;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await bulkApproveApplicationsServerFn({
    data: {
      accessToken,
      applicationIds: input.applicationIds,
      applicantMessage: input.applicantMessage,
      portalMessageSubject: input.portalMessageSubject,
      portalMessageBody: input.portalMessageBody,
    },
  });
}

export async function adminBulkApproveByCategory(input: {
  category: "shortlisted" | "under_review" | "submitted" | "all_eligible";
  applicantMessage?: string | undefined;
  portalMessageSubject?: string | undefined;
  portalMessageBody?: string | undefined;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await bulkApproveCategoryServerFn({
    data: {
      accessToken,
      category: input.category,
      applicantMessage: input.applicantMessage,
      portalMessageSubject: input.portalMessageSubject,
      portalMessageBody: input.portalMessageBody,
    },
  });
}

export async function adminBulkRevokeApprovedApplications(input?: {
  applicationIds?: string[] | undefined;
  targetToStatus?: "under_review" | "submitted" | undefined;
  internalReason?: string | undefined;
  applicantMessage?: string | undefined;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired.");

  return await bulkRevokeApprovedApplicationsServerFn({
    data: {
      accessToken,
      applicationIds: input?.applicationIds,
      targetToStatus: input?.targetToStatus || "under_review",
      internalReason: input?.internalReason,
      applicantMessage: input?.applicantMessage,
    },
  });
}

// 7. Complete Requested Document Upload Server Function (Bulletproof fallback)
export const completeRequestedDocumentUploadServerFn = createServerFn({ method: "POST" })
  .validator(completeUploadSchema)
  .handler(async ({ data }) => {
    const { user, adminClient } = await verifyUserAndGetAdminClient(data.accessToken);

    const { data: app, error: appErr } = await adminClient
      .from("applications")
      .select("id, applicant_id")
      .eq("id", data.applicationId)
      .maybeSingle();

    if (appErr || !app || app.applicant_id !== user.id) {
      throw new Error("You are not authorized to update this document.");
    }

    const { error: updateErr } = await adminClient
      .from("application_documents")
      .update({
        display_name: data.displayName.trim(),
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        uploaded_at: new Date().toISOString(),
        scan_status: "pending",
      })
      .eq("id", data.documentId)
      .eq("application_id", data.applicationId);

    if (updateErr) {
      console.error("completeRequestedDocumentUploadServerFn error:", updateErr);
      throw new Error("Could not update document record.");
    }

    return { success: true };
  });

// 8. Register Application Document Server Function (Bulletproof fallback)
export const registerApplicationDocumentServerFn = createServerFn({ method: "POST" })
  .validator(registerDocSchema)
  .handler(async ({ data }) => {
    const { user, adminClient } = await verifyUserAndGetAdminClient(data.accessToken);

    const { data: app, error: appErr } = await adminClient
      .from("applications")
      .select("id, applicant_id")
      .eq("id", data.applicationId)
      .maybeSingle();

    if (appErr || !app || app.applicant_id !== user.id) {
      throw new Error("You are not authorized to attach documents to this application.");
    }

    const { data: doc, error: insertErr } = await adminClient
      .from("application_documents")
      .insert({
        application_id: data.applicationId,
        document_type: data.documentType.trim(),
        display_name: data.displayName.trim(),
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        uploaded_at: new Date().toISOString(),
        scan_status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !doc) {
      console.error("registerApplicationDocumentServerFn error:", insertErr);
      throw new Error("Could not register document record.");
    }

    return { id: doc.id };
  });

// 9. Get Signed Document URL Server Function
export const getSignedDocumentUrlServerFn = createServerFn({ method: "POST" })
  .validator(getDocUrlSchema)
  .handler(async ({ data }) => {
    const { user, adminClient } = await verifyUserAndGetAdminClient(data.accessToken);

    const isOwner = data.storagePath.startsWith(`${user.id}/`);
    let isStaff = false;
    if (!isOwner) {
      const { data: staff } = await adminClient
        .from("staff_profiles")
        .select("active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      const isSuperAdminEmail =
        user.email === "officialnwachukwudivine@gmail.com" ||
        user.email?.endsWith("@thefreeschoolfoundation.com.ng");
      isStaff = Boolean(staff?.active || isSuperAdminEmail);
    }

    if (!isOwner && !isStaff) {
      throw new Error("Unauthorized to access this document.");
    }

    const { data: signed, error: signErr } = await adminClient.storage
      .from("application-documents")
      .createSignedUrl(data.storagePath, 3600);

    if (signErr || !signed?.signedUrl) {
      const { data: pub } = adminClient.storage
        .from("application-documents")
        .getPublicUrl(data.storagePath);
      return { url: pub.publicUrl };
    }

    return { url: signed.signedUrl };
  });

