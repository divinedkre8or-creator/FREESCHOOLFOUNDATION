import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  LoaderCircle,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Printer,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  UserCheck,
  X,
  XCircle,
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
import {
  adminUpdateDocumentStatus,
  deleteApplicationRecord,
} from "@/lib/admin/admin-actions";

export const Route = createFileRoute("/admin/applicants/$applicationId")({
  component: ApplicantProfile,
});

function ApplicantProfile() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const { applications, setState } = useStore();
  const application = applications.find((item) => item.id === applicationId);

  const [loadingInitial, setLoadingInitial] = useState(!application);
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? "Submitted");
  const [statusMessage, setStatusMessage] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [messagePriority, setMessagePriority] = useState<"normal" | "high">("normal");
  const [documentType, setDocumentType] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);

  // Sync state if application loads after initial render
  useEffect(() => {
    let active = true;
    if (!application) {
      setLoadingInitial(true);
      void loadAdminApplications()
        .then((refreshed) => {
          if (active) {
            setState((state) => ({ ...state, applications: refreshed }));
          }
        })
        .finally(() => {
          if (active) setLoadingInitial(false);
        });
    } else {
      setLoadingInitial(false);
      setStatus(application.status);
    }
    return () => {
      active = false;
    };
  }, [applicationId, application?.status]);

  // B1: Processing Checklist (session-only, resets on page load)
  const [checklist, setChecklist] = useState({
    biodata: false,
    qualifications: false,
    documents: false,
    motivation: false,
    decision: false,
  });
  const toggleCheck = (key: keyof typeof checklist) =>
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  const checklistProgress = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;

  // B4: Collapsible dossier sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  const handleUpdateDocumentStatus = async (
    docId: string,
    scanStatus: "clean" | "rejected" | "pending",
    docName: string,
  ) => {
    if (!application) return;
    setUpdatingDocId(docId);
    setFeedback("");
    try {
      await adminUpdateDocumentStatus(application.id, docId, scanStatus);
      await refresh();
      setFeedback(
        scanStatus === "clean"
          ? `Document "${docName}" scrutinized and verified clean.`
          : scanStatus === "rejected"
            ? `Document "${docName}" marked as rejected / ineligible.`
            : `Document "${docName}" reset to pending scrutiny.`,
      );
      toggleCheck("documents");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to update document status.");
    } finally {
      setUpdatingDocId(null);
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

  const handleOpenDoc = async (doc: {
    id: string;
    name: string;
    storagePath?: string | undefined;
  }) => {
    if (!doc.storagePath) return;
    setOpeningDocId(doc.id);
    try {
      const url = await getDocumentUrl(doc.storagePath);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      setFeedback("The document could not be opened. Please try again.");
    } finally {
      setOpeningDocId(null);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <LoaderCircle className="h-8 w-8 animate-spin text-brand-green" />
        <p className="text-sm font-semibold text-muted-foreground">Loading applicant profile…</p>
      </div>
    );
  }

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

        {/* B3: Print Dossier & Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
            onClick={() => {
              const printSection = document.getElementById("dossier-print-area");
              if (!printSection) return;
              const printWin = window.open("", "_blank");
              if (!printWin) return;
              printWin.document.write(`
                <!DOCTYPE html>
                <html><head>
                  <title>${fullName(application)} — ${application.appNumber}</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111; font-size: 13px; }
                    h1 { font-size: 20px; margin-bottom: 4px; }
                    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin: 20px 0 8px; border-bottom: 2px solid #e5e5e5; padding-bottom: 4px; }
                    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
                    dt { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
                    dd { font-weight: 600; margin-bottom: 4px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
                    .header-left span { font-size: 11px; color: #888; }
                    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #e5e5e5; }
                    .essay { background: #f9f9f9; padding: 12px; border-radius: 8px; margin-top: 6px; white-space: pre-line; line-height: 1.6; }
                    .doc-list { list-style: none; }
                    .doc-list li { padding: 6px 0; border-bottom: 1px solid #eee; }
                    .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; }
                    @media print { body { padding: 12px; } }
                  </style>
                </head><body>
                  ${printSection.innerHTML}
                  <div class="footer">The Free School Foundation — Printed ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</div>
                </body></html>
              `);
              printWin.document.close();
              printWin.focus();
              printWin.print();
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Print Dossier
          </Button>

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
                    This will remove all uploaded certificates, review notes, status history, and
                    messages. The application code <strong>{application.appNumber}</strong> will be
                    freed up in the database so subsequent applicants can register without gaps.
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
        <div className="space-y-5" id="dossier-print-area">
          {/* Print-only header */}
          <div className="hidden print:block">
            <div className="header">
              <div className="header-left">
                <h1>{fullName(application)}</h1>
                <span>
                  {application.appNumber} • {application.programme} ({application.level})
                </span>
              </div>
              <div className="badge">{application.status}</div>
            </div>
          </div>

          {/* Section 1: Application Programme & Award */}
          <CollapsibleSection
            title="Application & Campaign Dossier"
            sectionKey="campaign"
            collapsed={collapsedSections["campaign"]}
            onToggle={toggleSection}
          >
            <InfoGrid
              values={[
                ["Programme Applied", application.programme],
                [
                  "Target Award Level",
                  application.level === "ND"
                    ? "National Diploma (ND)"
                    : "Higher National Diploma (HND)",
                ],
                ["Partner Institution", "Citi Polytechnic ODL Partnership"],
                ["Scholarship Campaign", application.campaign],
                ["Application Date", formatDate(application.submittedAt)],
                [
                  "Communication Consent",
                  application.consentCommunication ? "Agreed & Opted In" : "Declined",
                ],
              ]}
            />
          </CollapsibleSection>

          {/* Section 2: Personal Biodata Verification */}
          <CollapsibleSection
            title="Personal Biodata & Residence"
            sectionKey="biodata"
            collapsed={collapsedSections["biodata"]}
            onToggle={toggleSection}
          >
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
          </CollapsibleSection>

          {/* Section 3: Educational Background Scrutiny */}
          <CollapsibleSection
            title="Academic Qualifications & Examination History"
            sectionKey="qualifications"
            collapsed={collapsedSections["qualifications"]}
            onToggle={toggleSection}
          >
            <InfoGrid
              values={Object.entries(application.education).map(([key, value]) => [
                key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())
                  .trim(),
                value ?? "—",
              ])}
            />
          </CollapsibleSection>

          {/* Section 4: Scholarship Essays */}
          <CollapsibleSection
            title="Scholarship Motivation & Employment"
            sectionKey="motivation"
            collapsed={collapsedSections["motivation"]}
            onToggle={toggleSection}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Employment Status
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {application.scholarship.employmentStatus || "—"}
                </dd>
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
          </CollapsibleSection>

          {/* Section 5: Documents Scrutiny & Verification Tray */}
          <CollapsibleSection
            title={`Attached Supporting Documents (${application.documents.length})`}
            sectionKey="documents"
            collapsed={collapsedSections["documents"]}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              {application.documents.length === 0 && (
                <p className="rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                  No certificates or documents attached to this record.
                </p>
              )}

              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-green/40 shadow-xs"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green-soft text-brand-green-dark">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} •{" "}
                          {doc.uploaded
                            ? `Uploaded ${formatDate(doc.uploadedAt)}`
                            : "Awaiting Upload"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        doc.scanStatus === "clean"
                          ? "bg-brand-green-soft text-brand-green-dark border border-brand-green/30"
                          : doc.scanStatus === "rejected"
                            ? "bg-destructive/10 text-destructive border border-destructive/30"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {doc.scanStatus === "clean" ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Verified Clean
                        </>
                      ) : doc.scanStatus === "rejected" ? (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Rejected / Ineligible
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" /> Pending Scrutiny
                        </>
                      )}
                    </span>
                  </div>

                  {/* Scrutiny & Verification Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
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
                          View Certificate
                        </Button>
                      )}
                    </div>

                    {/* Scrutiny Decision Buttons */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={doc.scanStatus === "clean" ? "default" : "outline"}
                        size="sm"
                        disabled={updatingDocId === doc.id}
                        onClick={() => void handleUpdateDocumentStatus(doc.id, "clean", doc.name)}
                        className={`h-8 gap-1 text-xs font-bold ${
                          doc.scanStatus === "clean"
                            ? "bg-brand-green text-white hover:bg-brand-green-dark"
                            : "text-brand-green-dark hover:bg-brand-green-soft"
                        }`}
                      >
                        {updatingDocId === doc.id ? (
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Verify Clean
                      </Button>

                      <Button
                        variant={doc.scanStatus === "rejected" ? "destructive" : "outline"}
                        size="sm"
                        disabled={updatingDocId === doc.id}
                        onClick={() => void handleUpdateDocumentStatus(doc.id, "rejected", doc.name)}
                        className={`h-8 gap-1 text-xs font-bold ${
                          doc.scanStatus === "rejected"
                            ? "bg-destructive text-white"
                            : "text-destructive hover:bg-destructive/10 border-destructive/30"
                        }`}
                      >
                        {updatingDocId === doc.id ? (
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Flag / Reject
                      </Button>

                      {doc.scanStatus && doc.scanStatus !== "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingDocId === doc.id}
                          onClick={() => void handleUpdateDocumentStatus(doc.id, "pending", doc.name)}
                          className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
                          title="Reset to Pending"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Section 6: Status & Audit History */}
          <CollapsibleSection
            title="Application Audit & Status History"
            sectionKey="history"
            collapsed={collapsedSections["history"]}
            onToggle={toggleSection}
          >
            <ol className="space-y-3">
              {[...application.history].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border/80 bg-secondary/20 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{entry.status}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.at)}
                    </span>
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
          </CollapsibleSection>
        </div>

        {/* Right Column: Administrative Review Actions */}
        <aside className="space-y-5">
          {/* B1: Processing Checklist */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ClipboardCheck className="h-4 w-4 text-brand-green" /> Processing Checklist
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                {checklistProgress}/{checklistTotal}
              </span>
            </div>
            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-green transition-all duration-300"
                style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {(
                [
                  ["biodata", "Reviewed personal biodata"],
                  ["qualifications", "Verified academic qualifications"],
                  ["documents", "Inspected all attached documents"],
                  ["motivation", "Read scholarship motivation statement"],
                  ["decision", "Made status decision"],
                ] as const
              ).map(([key, label]) => (
                <li key={key}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-xs transition-colors hover:bg-secondary/60"
                    onClick={() => toggleCheck(key)}
                  >
                    {checklist[key] ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-brand-green" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`font-medium ${checklist[key] ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Status Decision Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <UserCheck className="h-4 w-4 text-brand-green" /> Review Decision
              </div>
              <span className="text-[11px] font-bold text-brand-orange">
                Current: {application.status}
              </span>
            </div>

            {/* Quick Decision Presets */}
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Placement Presets
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Approved");
                    setStatusMessage("Congratulations! Your scholarship application has been APPROVED for Citi Polytechnic ODL 2026. Next onboarding steps will follow.");
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition-all ${
                    status === "Approved"
                      ? "border-brand-green bg-brand-green-soft text-brand-green-dark shadow-xs"
                      : "border-border hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  ✓ Approve
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatus("Shortlisted");
                    setStatusMessage("Your application has been shortlisted for final committee review.");
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition-all ${
                    status === "Shortlisted"
                      ? "border-brand-orange bg-brand-orange-soft text-brand-orange shadow-xs"
                      : "border-border hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  ★ Shortlist
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatus("Under Review");
                    setStatusMessage("Your application and academic documents are undergoing formal scrutiny.");
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition-all ${
                    status === "Under Review"
                      ? "border-info bg-info/10 text-info shadow-xs"
                      : "border-border hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  ⏳ Under Review
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatus("Additional Documents Required");
                    setStatusMessage("We require additional or clearer supporting documents to finalize our review. Please upload them below.");
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition-all ${
                    status === "Additional Documents Required"
                      ? "border-warning bg-warning/10 text-warning shadow-xs"
                      : "border-border hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  ⚠ Request Docs
                </button>
              </div>
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Or Select Any Status
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground normal-case tracking-normal"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {STATUSES.filter((item) => item !== "Draft").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            {/* B2: Applicant-Facing Status Message */}
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Message to Candidate (Optional)
                <Textarea
                  className="mt-1.5 text-xs normal-case tracking-normal"
                  rows={2}
                  placeholder="e.g. Your application has been approved for scholarship award…"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                />
              </label>
              <p className="mt-1 text-[10px] text-muted-foreground">
                This message will appear in candidate's portal timeline.
              </p>
            </div>

            <Button
              className="mt-4 w-full font-bold"
              disabled={saving || (status === application.status && !statusMessage.trim())}
              onClick={() =>
                void runAction(async () => {
                  await changeApplicationStatus(application.id, status, statusMessage || undefined);
                  try {
                    await sendPlatformEmail({
                      applicationIds: [application.id],
                      event: "status",
                    });
                  } catch {
                    setStatusMessage("");
                    return "Status updated, but email notification failed. Retry from Communications.";
                  }
                  setStatusMessage("");
                  toggleCheck("decision");
                  return undefined;
                }, "Application status updated and synced.")
              }
            >
              {saving ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Review Decision
            </Button>
          </section>

          {/* Private Internal Notes Box */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <NotebookPen className="h-4 w-4 text-brand-orange" /> Internal Staff Notes
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Confidential and never visible to the applicant.
            </p>
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
            <p
              role="status"
              className={`rounded-xl border p-4 text-xs font-bold ${
                feedback.toLowerCase().includes("failed") ||
                feedback.toLowerCase().includes("could not") ||
                feedback.toLowerCase().includes("error") ||
                feedback.toLowerCase().includes("not allowed")
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-brand-green/30 bg-brand-green-soft text-brand-green-dark"
              }`}
            >
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

function CollapsibleSection({
  title,
  sectionKey,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  collapsed?: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  const isCollapsed = collapsed ?? false;
  return (
    <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between p-5 md:p-6 text-left"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={!isCollapsed}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-orange">{title}</h2>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {!isCollapsed && <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>}
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
