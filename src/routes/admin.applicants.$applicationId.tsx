import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  LoaderCircle,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Save,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUSES, formatDate, formatDateTime, fullName, type ApplicationStatus } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { sendPlatformEmail } from "@/lib/email/platform-email";
import {
  addApplicationNote,
  changeApplicationStatus,
  getDocumentUrl,
  loadAdminApplications,
  requestApplicationDocument,
  sendPortalMessage,
} from "@/lib/supabase/applications";
import { deleteApplicationRecord } from "@/lib/admin/admin-actions";

export const Route = createFileRoute("/admin/applicants/$applicationId")({
  component: ApplicantProfile,
});

function ApplicantProfile() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const { applications, setState } = useStore();
  const application = applications.find((item) => item.id === applicationId);

  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? "Submitted");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [messagePriority, setMessagePriority] = useState<"normal" | "high">("normal");
  const [documentType, setDocumentType] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const refresh = async () => {
    const refreshed = await loadAdminApplications();
    setState((state) => ({ ...state, applications: refreshed }));
  };

  const runAction = async (action: () => Promise<string | void>, success: string) => {
    setSaving(true);
    setFeedback("");
    try {
      const result = await action();
      await refresh();
      setFeedback(result || success);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!application) return;
    setDeleting(true);
    setFeedback("");
    try {
      await deleteApplicationRecord(application.id);
      // Remove from store
      setState((state) => ({
        ...state,
        applications: state.applications.filter((a) => a.id !== application.id),
      }));
      // Navigate back to directory
      void navigate({ to: "/admin/applicants" });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to delete applicant record.");
      setDeleting(false);
    }
  };

  const handleOpenDoc = async (doc: { id: string; name: string; storagePath?: string | undefined }) => {
    if (!doc.storagePath) return;
    setOpeningDocId(doc.id);
    try {
      const url = await getDocumentUrl(doc.storagePath);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Handle error
    } finally {
      setOpeningDocId(null);
    }
  };

  if (!application)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Applicant record not found</h1>
        <p className="text-sm text-muted-foreground">
          The requested applicant profile may have been removed or deleted.
        </p>
        <Button asChild>
          <Link to="/admin/applicants">Return to Applicant Directory</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/applicants"
          className="inline-flex items-center text-xs font-bold text-brand-green-dark hover:underline"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Applicant Directory
        </Link>

        {/* Delete Record Trigger */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/30 text-xs font-bold text-destructive hover:bg-destructive hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Applicant
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Permanently Delete Applicant Record?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-left">
                <p>
                  You are about to permanently delete <strong>{fullName(application)}</strong> (
                  <code>{application.appNumber}</code>).
                </p>
                <p className="text-xs text-muted-foreground">
                  This will remove all uploaded certificates, review notes, status history, and messages.
                  The application code <strong>{application.appNumber}</strong> will be freed up in the database so subsequent applicants can register without gaps.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteApplication();
                }}
              >
                {deleting ? "Deleting Record…" : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Header Profile Dossier Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="bg-secondary/40 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold tracking-wider text-brand-orange">
                  {application.appNumber || "UNASSIGNED"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Submitted {formatDate(application.submittedAt)}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
                {fullName(application)}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                <a
                  href={`mailto:${application.personal.email}`}
                  className="flex items-center gap-1 hover:text-brand-green-dark hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 text-brand-green" />
                  {application.personal.email}
                </a>
                <a
                  href={`tel:${application.personal.phone}`}
                  className="flex items-center gap-1 hover:text-brand-green-dark hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-green" />
                  {application.personal.phone}
                </a>
              </div>
            </div>

            <div className="sm:text-right">
              <StatusBadge status={application.status} />
              <p className="mt-2 text-xs font-bold text-foreground">
                {application.programme} ({application.level})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scrutiny Layout */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left Column: Dossier Details */}
        <div className="space-y-5">
          {/* Section 1: Application Programme & Award */}
          <ProfileSection title="Application & Campaign Dossier">
            <InfoGrid
              values={[
                ["Programme Applied", application.programme],
                ["Target Award Level", application.level === "ND" ? "National Diploma (ND)" : "Higher National Diploma (HND)"],
                ["Partner Institution", "Citi Polytechnic ODeL Partnership"],
                ["Scholarship Campaign", application.campaign],
                ["Application Date", formatDate(application.submittedAt)],
                ["Communication Consent", application.consentCommunication ? "Agreed & Opted In" : "Declined"],
              ]}
            />
          </ProfileSection>

          {/* Section 2: Personal Biodata Verification */}
          <ProfileSection title="Personal Biodata & Residence">
            <InfoGrid
              values={[
                ["Full Legal Name", fullName(application)],
                ["Date of Birth", formatDate(application.personal.dob)],
                ["State of Origin", application.personal.stateOfOrigin],
                ["State of Residence", application.personal.stateOfResidence],
                ["Residential Address", application.personal.address],
                ["Contact Phone", application.personal.phone],
              ]}
            />
          </ProfileSection>

          {/* Section 3: Educational Background Scrutiny */}
          <ProfileSection title="Academic Qualifications & Examination History">
            <InfoGrid
              values={Object.entries(application.education).map(([key, value]) => [
                key.replace(/([A-Z])/g, " $1"),
                value ?? "—",
              ])}
            />
          </ProfileSection>

          {/* Section 4: Scholarship Essays */}
          <ProfileSection title="Scholarship Motivation & Employment">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Employment Status
                </dt>
                <dd className="mt-1 text-sm font-bold">{application.scholarship.employmentStatus || "—"}</dd>
              </div>
              {application.scholarship.occupation && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Occupation / Field
                  </dt>
                  <dd className="mt-1 text-sm font-bold">{application.scholarship.occupation}</dd>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Statement of Need & Motivation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-line bg-secondary/30 p-4 rounded-xl">
                {application.scholarship.reason}
              </p>
            </div>

            {application.scholarship.goals && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Career & Educational Goals
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-line bg-secondary/30 p-4 rounded-xl">
                  {application.scholarship.goals}
                </p>
              </div>
            )}
          </ProfileSection>

          {/* Section 5: Documents Scrutiny Tray */}
          <ProfileSection title={`Attached Supporting Documents (${application.documents.length})`}>
            <div className="space-y-3">
              {application.documents.length === 0 && (
                <p className="rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                  No certificates or documents attached to this record.
                </p>
              )}

              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green-soft text-brand-green-dark">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} • {doc.uploaded ? `Uploaded ${formatDate(doc.uploadedAt)}` : "Awaiting Upload"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                      {doc.scanStatus === "clean"
                        ? "Verified Clean"
                        : doc.scanStatus === "rejected"
                          ? "Rejected"
                          : doc.uploaded
                            ? "Stored Securely"
                            : "Pending"}
                    </span>

                    {doc.storagePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={openingDocId === doc.id}
                        onClick={() => void handleOpenDoc(doc)}
                        className="h-8 gap-1 text-xs font-bold text-brand-green-dark hover:bg-brand-green-soft"
                      >
                        {openingDocId === doc.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        View Document
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>

          {/* Section 6: Status & Audit History */}
          <ProfileSection title="Application Audit & Status History">
            <ol className="space-y-3">
              {[...application.history].reverse().map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border/80 bg-secondary/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{entry.status}</p>
                    <span className="text-[11px] text-muted-foreground">{formatDateTime(entry.at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Recorded by {entry.by}</p>
                  {entry.comment && (
                    <p className="mt-2 text-xs text-foreground bg-card p-2 rounded border border-border/60">
                      {entry.comment}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </ProfileSection>
        </div>

        {/* Right Column: Administrative Review Actions */}
        <aside className="space-y-5">
          {/* Status Decision Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <UserCheck className="h-4 w-4 text-brand-green" /> Review Decision
            </div>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assign Status
              <select
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground normal-case tracking-normal"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {STATUSES.filter((item) => item !== "Draft").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Button
              className="mt-4 w-full font-bold"
              disabled={saving || status === application.status}
              onClick={() =>
                void runAction(async () => {
                  await changeApplicationStatus(application.id, status);
                  try {
                    await sendPlatformEmail({
                      applicationIds: [application.id],
                      event: "status",
                    });
                  } catch {
                    return "Status updated, but email notification failed. Retry from Communications.";
                  }
                  return undefined;
                }, "Application status updated and synced.")
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Update Status
            </Button>
          </section>

          {/* Private Internal Notes Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <NotebookPen className="h-4 w-4 text-brand-orange" /> Internal Staff Notes
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Confidential and never visible to the applicant.</p>
            <Textarea
              className="mt-3 text-xs"
              rows={3}
              placeholder="Add observation, verification note, or interview comment…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="outline"
              className="mt-3 w-full text-xs font-semibold"
              disabled={saving || !note.trim()}
              onClick={() =>
                void runAction(async () => {
                  await addApplicationNote(application.id, note);
                  setNote("");
                }, "Confidential note recorded.")
              }
            >
              Save Internal Note
            </Button>

            <div className="mt-4 space-y-2.5">
              {application.notes.map((item) => (
                <div key={item.id} className="rounded-lg bg-secondary/50 p-3 text-xs">
                  <p className="text-foreground">{item.body}</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {item.author} • {formatDate(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Send Official Message Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <MessageSquare className="h-4 w-4 text-brand-green" /> Dispatch Message
            </div>
            <Textarea
              className="mt-3 text-xs"
              rows={3}
              placeholder="Write formal applicant message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <select
              aria-label="Message priority"
              className="mt-2.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
              value={messagePriority}
              onChange={(event) => setMessagePriority(event.target.value as "normal" | "high")}
            >
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority (Urgent Badge)</option>
            </select>
            <Button
              className="mt-3 w-full text-xs font-bold"
              disabled={saving || !message.trim()}
              onClick={() =>
                void runAction(async () => {
                  await sendPortalMessage({
                    applicationIds: [application.id],
                    subject: "Application Update from Scholarship Committee",
                    body: message,
                    priority: messagePriority,
                  });
                  try {
                    await sendPlatformEmail({
                      applicationIds: [application.id],
                      event: "message",
                      subject: "Application Update from Scholarship Committee",
                      body: message,
                    });
                  } catch {
                    setMessage("");
                    return "Portal message dispatched, but email failed.";
                  }
                  setMessage("");
                  return undefined;
                }, "Message dispatched to candidate portal.")
              }
            >
              Send Portal Dispatch
            </Button>
          </section>

          {/* Request Document Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <FileText className="h-4 w-4 text-brand-orange" /> Request Document
            </div>
            <input
              className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              placeholder="e.g. Birth Certificate, ND Transcript"
              maxLength={120}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            />
            <Button
              variant="outline"
              className="mt-3 w-full text-xs font-semibold"
              disabled={saving || !documentType.trim()}
              onClick={() =>
                void runAction(async () => {
                  await requestApplicationDocument(application.id, documentType);
                  try {
                    await sendPlatformEmail({
                      applicationIds: [application.id],
                      event: "document_request",
                      body: documentType,
                    });
                  } catch {
                    setDocumentType("");
                    return "Document request added to portal, but email failed.";
                  }
                  setDocumentType("");
                  return undefined;
                }, "Document request added to candidate portal.")
              }
            >
              Request From Candidate
            </Button>
          </section>

          {feedback && (
            <p role="status" className="rounded-xl border border-brand-green/30 bg-brand-green-soft p-4 text-xs font-bold text-brand-green-dark">
              {feedback}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-soft">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-orange">{title}</h2>
      {children}
    </section>
  );
}

function InfoGrid({ values }: { values: (string | undefined)[][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-bold text-foreground break-words">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
