import { getSupabaseBrowserClient } from "./browser";
import type { Application, ApplicationStatus } from "../fsf";

const CAMPAIGN_ID = "20000000-0000-0000-0000-000000000001";
const APPLICATION_SELECT =
  "id,application_number,status,level,personal,education,scholarship_responses,communication_consent,created_at,submitted_at,programmes(name),application_documents(id,display_name,document_type,uploaded_at,storage_path,scan_status,requested_at),application_status_history(id,to_status,created_at,applicant_message),internal_notes(id,body,created_at),message_recipients(read_at,messages(id,subject,body,created_at,priority))";

type ApplicationRow = {
  id: string;
  application_number: string | null;
  status: string;
  level: string;
  personal: unknown;
  education: unknown;
  scholarship_responses: unknown;
  communication_consent: boolean | null;
  created_at: string;
  submitted_at: string | null;
  programmes: { name?: string } | null;
  application_documents: Array<Record<string, unknown>> | null;
  application_status_history: Array<Record<string, unknown>> | null;
  internal_notes: Array<Record<string, unknown>> | null;
  message_recipients: Array<{
    read_at: string | null;
    messages: {
      id: string;
      subject: string;
      body: string;
      created_at: string;
      priority: "normal" | "high";
    } | null;
  }> | null;
};

export type ApplicationSubmission = {
  level: "ND" | "HND";
  programme: string;
  personal: Record<string, unknown>;
  education: Record<string, unknown>;
  scholarshipResponses: Record<string, unknown>;
  communicationConsent: boolean;
  document?: File | null;
};

export type SubmittedApplication = {
  id: string;
  applicationNumber: string;
  submittedAt: string;
};

export async function submitApplicationToSupabase(
  input: ApplicationSubmission,
): Promise<SubmittedApplication> {
  if (
    input.document &&
    (!["application/pdf", "image/jpeg", "image/png"].includes(input.document.type) ||
      input.document.size < 1 ||
      input.document.size > 10 * 1024 * 1024)
  )
    throw new Error("Upload a PDF, JPG or PNG file smaller than 10 MB.");

  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) throw new Error("Your session has expired. Sign in again to continue.");

  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id")
    .eq("name", input.programme)
    .eq("active", true)
    .single();
  if (programmeError || !programme)
    throw new Error("That programme is not currently available. Refresh and try again.");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      first_name: String(input.personal["firstName"] ?? ""),
      last_name: String(input.personal["lastName"] ?? ""),
      phone: String(input.personal["phone"] ?? ""),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileError) throw new Error("We could not save your profile. Please try again.");

  const { data: existing } = await supabase
    .from("applications")
    .select("id,status,application_number,submitted_at")
    .eq("applicant_id", user.id)
    .eq("campaign_id", CAMPAIGN_ID)
    .maybeSingle();

  if (existing?.status !== "draft" && existing?.application_number) {
    return {
      id: existing.id,
      applicationNumber: existing.application_number,
      submittedAt: existing.submitted_at ?? new Date().toISOString(),
    };
  }

  const draftPayload = {
    applicant_id: user.id,
    campaign_id: CAMPAIGN_ID,
    programme_id: programme.id,
    level: input.level.toLowerCase(),
    status: "draft",
    current_step: 6,
    personal: input.personal,
    education: input.education,
    scholarship_responses: input.scholarshipResponses,
    declaration_accepted_at: new Date().toISOString(),
    communication_consent: input.communicationConsent,
    updated_at: new Date().toISOString(),
  };

  const draftQuery = existing
    ? supabase.from("applications").update(draftPayload).eq("id", existing.id)
    : supabase.from("applications").insert(draftPayload);
  const { data: draft, error: draftError } = await draftQuery.select("id").single();
  if (draftError || !draft)
    throw new Error("We could not save your application. Please try again.");

  if (input.document) {
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      pdf: "application/pdf",
      webp: "image/webp",
    };
    const extension = input.document.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const rawMime = input.document.type?.toLowerCase().trim() || "";
    const normalizedMime =
      rawMime === "image/jpg" || rawMime === "image/pjpeg"
        ? "image/jpeg"
        : rawMime || mimeMap[extension] || "application/pdf";

    const storagePath = `${user.id}/${draft.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("application-documents")
      .upload(storagePath, input.document, {
        contentType: normalizedMime,
        upsert: false,
      });
    if (uploadError) throw new Error("Your document could not be uploaded. Please try again.");

    const { data: documentId, error: documentError } = await supabase.rpc(
      "register_application_document",
      {
        target_application_id: draft.id,
        target_document_type: input.level === "ND" ? "O'Level Result" : "ND Result",
        target_display_name: input.document.name,
        target_storage_path: storagePath,
        target_mime_type: normalizedMime,
        target_size_bytes: input.document.size,
      },
    );
    if (documentError || !documentId) {
      console.error("Document registration error:", documentError);
      throw new Error("Your document record could not be saved. Please try again.");
    }
    void supabase.functions
      .invoke("scan-document", { body: { documentId } })
      .catch(() => undefined);
  }

  const { data: submitted, error: submitError } = await supabase
    .rpc("submit_application", { target_application_id: draft.id })
    .single();
  if (submitError || !submitted?.application_number)
    throw new Error("Your application could not be submitted. Please try again.");

  return {
    id: submitted.id,
    applicationNumber: submitted.application_number,
    submittedAt: submitted.submitted_at,
  };
}

const STATUS_MAP: Record<string, ApplicationStatus> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  additional_documents_required: "Additional Documents Required",
  approved: "Approved",
  enrolled: "Enrolled",
  not_successful: "Not Successful",
};

export async function loadMyApplication(): Promise<Application | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .eq("applicant_id", userData.user.id)
    .eq("campaign_id", CAMPAIGN_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.application_number) return null;
  return mapApplication(data as unknown as ApplicationRow);
}

export async function loadAdminApplications(): Promise<Application[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("applications")
    .select(APPLICATION_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Applications could not be loaded.");
  return ((data ?? []) as unknown as ApplicationRow[])
    .filter((row) => Boolean(row.application_number))
    .map(mapApplication);
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("message_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("message_id", messageId);
  if (error) throw new Error("Message could not be marked as read.");
}

export async function sendPortalMessage(input: {
  applicationIds: string[];
  subject: string;
  body: string;
  priority: "normal" | "high";
}): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc("send_portal_message", {
    target_application_ids: input.applicationIds,
    message_subject: input.subject,
    message_body: input.body,
    message_priority: input.priority,
  });
  if (error) throw new Error("The portal message could not be sent.");
  return Number(data ?? 0);
}

const STATUS_TO_DB: Record<ApplicationStatus, string> = {
  Draft: "draft",
  Submitted: "submitted",
  "Under Review": "under_review",
  Shortlisted: "shortlisted",
  "Additional Documents Required": "additional_documents_required",
  Approved: "approved",
  Enrolled: "enrolled",
  "Not Successful": "not_successful",
};

export async function changeApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  applicantMessage?: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("change_application_status", {
    target_application_id: applicationId,
    target_status: STATUS_TO_DB[status],
    applicant_message: applicantMessage ?? null,
    internal_reason: null,
  });
  if (error) throw new Error("The status change was not allowed or could not be saved.");
}

export async function addApplicationNote(applicationId: string, body: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("add_application_note", {
    target_application_id: applicationId,
    note_body: body,
  });
  if (error) throw new Error("The private note could not be saved.");
}

export async function requestApplicationDocument(
  applicationId: string,
  documentType: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("request_application_document", {
    target_application_id: applicationId,
    requested_document_type: documentType,
  });
  if (error) throw new Error("The document request could not be saved.");
}

export async function uploadRequestedDocument(input: {
  applicationId: string;
  documentId: string;
  file: File;
}): Promise<void> {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(input.file.type))
    throw new Error("Upload a PDF, JPG or PNG file.");
  if (input.file.size < 1 || input.file.size > 10 * 1024 * 1024)
    throw new Error("The file must be smaller than 10 MB.");

  const supabase = getSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Your session has expired.");
  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "file";
  const storagePath = `${userData.user.id}/${input.applicationId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("application-documents")
    .upload(storagePath, input.file, { upsert: false });
  if (uploadError) throw new Error("The document could not be uploaded.");

  const { error: recordError } = await supabase.rpc("complete_requested_document_upload", {
    target_document_id: input.documentId,
    target_application_id: input.applicationId,
    target_display_name: input.file.name,
    target_storage_path: storagePath,
    target_mime_type: input.file.type,
    target_size_bytes: input.file.size,
  });
  if (recordError) throw new Error("The document record could not be updated.");

  const { error: scanError } = await supabase.functions.invoke("scan-document", {
    body: { documentId: input.documentId },
  });
  if (scanError)
    throw new Error("The document is uploaded and quarantined while scanning retries.");
}

function mapApplication(data: ApplicationRow): Application {
  const personal = data.personal as Application["personal"];
  const education = data.education as Application["education"];
  const scholarship = data.scholarship_responses as Application["scholarship"];
  const programmeRelation = data.programmes as unknown as { name?: string } | null;
  const documents = (data.application_documents ?? []) as Array<Record<string, unknown>>;
  const history = (data.application_status_history ?? []) as Array<Record<string, unknown>>;
  const notes = (data.internal_notes ?? []) as Array<Record<string, unknown>>;
  const messageRecipients = data.message_recipients ?? [];

  return {
    id: data.id,
    appNumber: data.application_number ?? "",
    createdAt: data.created_at,
    ...(data.submitted_at ? { submittedAt: data.submitted_at } : {}),
    status: STATUS_MAP[data.status] ?? "Submitted",
    campaign: "Citi Polytechnic ODeL Scholarship 2026",
    level: String(data.level).toUpperCase() as "ND" | "HND",
    programme: (programmeRelation?.name ?? "Computer Science") as Application["programme"],
    personal,
    education,
    scholarship,
    documents: documents.map((document) => ({
      id: String(document["id"]),
      name: String(document["display_name"] ?? "Supporting document"),
      type: String(document["document_type"] ?? "Supporting document"),
      uploadedAt: String(document["uploaded_at"] ?? ""),
      uploaded: Boolean(document["storage_path"]),
      requested: Boolean(document["requested_at"]),
      ...(document["scan_status"]
        ? {
            scanStatus: String(document["scan_status"]) as
              "pending" | "clean" | "rejected" | "failed",
          }
        : {}),
    })),
    messages: messageRecipients
      .filter((recipient) => Boolean(recipient.messages))
      .map((recipient) => ({
        id: recipient.messages!.id,
        from: "admin" as const,
        subject: recipient.messages!.subject,
        body: recipient.messages!.body,
        sentAt: recipient.messages!.created_at,
        channel: "Portal" as const,
        read: Boolean(recipient.read_at),
        priority: recipient.messages!.priority,
      }))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    notes: notes
      .map((note) => ({
        id: String(note["id"]),
        author: "Authorized staff",
        body: String(note["body"] ?? ""),
        createdAt: String(note["created_at"] ?? ""),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    history: history.map((entry) => ({
      id: String(entry["id"]),
      status: STATUS_MAP[String(entry["to_status"])] ?? "Submitted",
      at: String(entry["created_at"]),
      by: "The Free School Foundation",
      ...(entry["applicant_message"] ? { comment: String(entry["applicant_message"]) } : {}),
    })),
    consentCommunication: Boolean(data.communication_consent),
  };
}
