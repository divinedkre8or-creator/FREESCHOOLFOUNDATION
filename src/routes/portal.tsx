import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  MessageSquare,
  Printer,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { PortalLayout, type PortalSection } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, fullName, STATUS_COPY, type ApplicationStatus } from "@/lib/fsf";
import { useCurrentApplication, useStore } from "@/lib/store";
import {
  getDocumentUrl,
  loadMyApplication,
  markMessageRead,
  uploadRequestedDocument,
} from "@/lib/supabase/applications";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/portal")({
  head: () =>
    seoHead({
      title: "Admission Portal | The Free School Foundation",
      description: "Private scholarship admission status, official records, documents, and messages.",
      path: "/portal",
      noIndex: true,
    }),
  component: PortalPage,
});

const PIPELINE_STAGES: Array<{
  key: string;
  label: string;
  matches: ApplicationStatus[];
}> = [
  { key: "submitted", label: "Application Submitted", matches: ["Submitted"] },
  { key: "review", label: "Under Review", matches: ["Under Review", "Additional Documents Required"] },
  { key: "shortlist", label: "Shortlisted", matches: ["Shortlisted"] },
  { key: "decision", label: "Enrolment & Admission", matches: ["Approved", "Enrolled", "Not Successful"] },
];

function getStageIndex(status: ApplicationStatus): number {
  if (status === "Submitted") return 0;
  if (status === "Under Review" || status === "Additional Documents Required") return 1;
  if (status === "Shortlisted") return 2;
  if (status === "Approved" || status === "Enrolled" || status === "Not Successful") return 3;
  return 0;
}

function PortalPage() {
  const [section, setSection] = useState<PortalSection>("overview");
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeDocUrl, setActiveDocUrl] = useState<{ name: string; url: string } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const application = useCurrentApplication();
  const { announcements, setState, ready } = useStore();
  const unreadMessages = application?.messages.filter((message) => !message.read) ?? [];

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const refresh = async () => {
      const loaded = await loadMyApplication();
      if (!active) return;
      if (loaded)
        setState((state) => ({
          ...state,
          applications: [loaded],
          currentApplicantId: loaded.id,
        }));
      setLoading(false);
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, setState]);

  useEffect(() => {
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadMessages.length > 0) void badgeNavigator.setAppBadge?.(unreadMessages.length);
    else void badgeNavigator.clearAppBadge?.();
  }, [unreadMessages.length]);

  const copyCode = async () => {
    if (!application?.appNumber) return;
    try {
      await navigator.clipboard.writeText(application.appNumber);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleViewDocument = async (doc: { id: string; name: string; storagePath?: string | undefined }) => {
    if (!doc.storagePath) return;
    setLoadingDocId(doc.id);
    try {
      const url = await getDocumentUrl(doc.storagePath);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Error opening
    } finally {
      setLoadingDocId(null);
    }
  };

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
          <p className="text-sm font-semibold text-muted-foreground">Loading admission portal…</p>
        </div>
      </div>
    );

  if (!application)
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 px-5">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lift">
          <Shield className="mx-auto h-10 w-10 text-brand-green" />
          <h1 className="mt-4 text-2xl font-extrabold">Sign In to Your Portal</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Access to your official admission and scholarship records requires authenticated sign-in.
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/login">Sign In with Applicant Account</Link>
          </Button>
        </div>
      </div>
    );

  const copy = STATUS_COPY[application.status];
  const urgentMessage = unreadMessages.find((message) => message.priority === "high");
  const currentStage = getStageIndex(application.status);

  const openMessages = async () => {
    setSection("messages");
    if (unreadMessages.length === 0) return;
    await Promise.allSettled(unreadMessages.map((message) => markMessageRead(message.id)));
    setState((state) => ({
      ...state,
      applications: state.applications.map((item) =>
        item.id === application.id
          ? { ...item, messages: item.messages.map((message) => ({ ...message, read: true })) }
          : item,
      ),
    }));
  };

  return (
    <PortalLayout
      active={section}
      unreadCount={unreadMessages.length}
      onChange={(nextSection) =>
        nextSection === "messages" ? void openMessages() : setSection(nextSection)
      }
    >
      {/* SECTION 1: OVERVIEW */}
      {section === "overview" && (
        <div className="space-y-6">
          {/* Top Welcome & Reference Banner */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="border-b border-border bg-gradient-to-r from-brand-green-dark via-brand-green to-brand-green-dark p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
                    <Award className="h-4 w-4" /> 2026 Academic Scholarship Admission
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                    Welcome, {application.personal.firstName}
                  </h1>
                  <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
                    {application.programme} • {application.level === "ND" ? "National Diploma (ND)" : "Higher National Diploma (HND)"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                    Application Reference
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold sm:text-lg">
                      {application.appNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyCode()}
                      className="rounded bg-white/20 p-1 text-white hover:bg-white/30"
                      title="Copy application number"
                      aria-label="Copy application number"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Progress Pipeline */}
            <div className="bg-secondary/20 p-4 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Admission Evaluation Progress
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isPassed = currentStage >= idx;
                  const isCurrent = currentStage === idx;
                  return (
                    <div
                      key={stage.key}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all ${
                        isCurrent
                          ? "border-brand-green bg-brand-green-soft/70 shadow-sm"
                          : isPassed
                            ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "border-border bg-card/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Stage {idx + 1}
                        </span>
                        {isPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-brand-green" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-xs font-bold ${
                          isCurrent ? "text-brand-green-dark" : "text-foreground"
                        }`}
                      >
                        {stage.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Urgent Message Alert if any */}
          {urgentMessage && (
            <button
              type="button"
              onClick={() => void openMessages()}
              className="flex w-full items-start gap-3 rounded-2xl border border-red-300 bg-red-50/90 p-4 text-left text-red-950 shadow-sm transition-transform hover:scale-[1.005] dark:bg-red-950/30 dark:text-red-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                  High Priority Foundation Dispatch
                </span>
                <p className="mt-1 font-bold text-red-900 dark:text-red-200">{urgentMessage.subject}</p>
                <p className="mt-0.5 text-xs text-red-800/80 dark:text-red-300">
                  Tap to view the official update from the admissions team.
                </p>
              </div>
            </button>
          )}

          {/* Status Details & Key Dossier */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Status Card */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft md:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                  Current Status
                </p>
                <StatusBadge status={application.status} />
              </div>
              <h2 className="mt-3 text-lg font-bold text-foreground sm:text-xl">
                {copy.applicant}
              </h2>

              <div className="mt-5 rounded-xl border border-border/80 bg-secondary/30 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Next Action Required
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{copy.next}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Partner Institution</span>
                  <p className="mt-1 font-bold">Citi Polytechnic</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Award Value</span>
                  <p className="mt-1 font-bold text-brand-green-dark">100% Tuition Free</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground">Date Submitted</span>
                  <p className="mt-1 font-bold">{formatDate(application.submittedAt)}</p>
                </div>
              </div>
            </section>

            {/* Quick Action Box */}
            <section className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-orange" />
                  <h3 className="font-bold">Candidate Actions</h3>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Quick shortcuts for managing your admission documents and communication.
                </p>

                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-semibold"
                    onClick={() => setSection("application")}
                  >
                    <FileText className="mr-2 h-3.5 w-3.5 text-brand-green" /> View Biodata & Form
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-semibold"
                    onClick={() => setSection("documents")}
                  >
                    <FileCheck className="mr-2 h-3.5 w-3.5 text-brand-green" /> Document Registry ({application.documents.length})
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-semibold"
                    onClick={() => setSection("messages")}
                  >
                    <MessageSquare className="mr-2 h-3.5 w-3.5 text-brand-green" /> Message Center
                  </Button>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">
                  Need help? Contact Foundation support at{" "}
                  <a
                    href="mailto:info@thefreeschoolfoundation.com.ng"
                    className="font-bold text-brand-green-dark underline"
                  >
                    info@thefreeschoolfoundation.com.ng
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SECTION 2: MY APPLICATION */}
      {section === "application" && (
        <Panel
          title="Official Candidate Biodata & Submission"
          description="The certified information catalogued in the Free School Foundation scholarship database."
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Printer className="h-3.5 w-3.5" /> Print Application Slip
            </Button>
          }
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                1. Personal Information
              </h2>
              <div className="mt-3 grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                <Info label="Full Legal Name" value={fullName(application)} />
                <Info label="Application Reference" value={application.appNumber} />
                <Info label="Email Address" value={application.personal.email} />
                <Info label="Phone Number" value={application.personal.phone} />
                <Info label="Date of Birth" value={formatDate(application.personal.dob)} />
                <Info label="State of Origin" value={application.personal.stateOfOrigin} />
                <Info label="State of Residence" value={application.personal.stateOfResidence} />
                <Info label="Residential Address" value={application.personal.address} />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                2. Academic Choice & Qualification
              </h2>
              <div className="mt-3 grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                <Info label="Chosen Programme" value={application.programme} />
                <Info
                  label="Target Award Level"
                  value={application.level === "ND" ? "National Diploma (ND)" : "Higher National Diploma (HND)"}
                />
                <Info label="Education Partner" value="Citi Polytechnic ODeL Partnership" />
                <Info label="Scholarship Campaign" value={application.campaign} />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                3. Prior Academic Records
              </h2>
              <div className="mt-3 grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                {Object.entries(application.education).map(([key, value]) => (
                  <Info
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1")}
                    value={value || "—"}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                4. Scholarship Motivation & Statement
              </h2>
              <div className="mt-3 space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Reason for Applying</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {application.scholarship.reason}
                  </p>
                </div>
                {application.scholarship.goals && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Career & Educational Goals</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {application.scholarship.goals}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* SECTION 3: DOCUMENTS */}
      {section === "documents" && (
        <Panel
          title="Official Document Registry"
          description="Verified academic credentials and supporting certificates requested by the scholarship committee."
        >
          <div className="space-y-4">
            {application.documents.length === 0 && (
              <p className="rounded-xl bg-secondary/50 p-5 text-center text-sm text-muted-foreground">
                No documents uploaded or requested yet.
              </p>
            )}

            {application.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green-soft text-brand-green-dark">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} • {doc.uploaded ? `Uploaded ${formatDate(doc.uploadedAt)}` : "Requested by Committee"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                  {doc.uploaded ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-2.5 py-1 text-xs font-bold text-brand-green-dark">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {doc.scanStatus === "clean"
                          ? "Verified"
                          : doc.scanStatus === "rejected"
                            ? "Rejected"
                            : "Secured"}
                      </span>

                      {doc.storagePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingDocId === doc.id}
                          onClick={() => void handleViewDocument(doc)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      )}
                    </div>
                  ) : (
                    <LabelButton
                      onFile={async (file) => {
                        await uploadRequestedDocument({
                          applicationId: application.id,
                          documentId: doc.id,
                          file,
                        });
                        const refreshed = await loadMyApplication();
                        if (refreshed)
                          setState((state) => ({
                            ...state,
                            applications: [refreshed],
                            currentApplicantId: refreshed.id,
                          }));
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* SECTION 4: MESSAGES */}
      {section === "messages" && (
        <Panel
          title="Official Dispatch Center"
          description="Formal communication and decision notices sent to your applicant account."
        >
          <div className="space-y-4">
            {application.messages.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold">No messages yet</p>
                <p className="mt-1 text-xs">Updates will appear here as your application is processed.</p>
              </div>
            )}

            {application.messages.map((message) => (
              <article
                key={message.id}
                className={`overflow-hidden rounded-xl border p-4 sm:p-5 ${
                  message.priority === "high"
                    ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {message.priority === "high" && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
                        Urgent
                      </span>
                    )}
                    <h2 className="font-bold text-foreground">{message.subject}</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(message.sentAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {message.body}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-semibold text-brand-green-dark">
                    Official Foundation Channel • {message.channel}
                  </span>
                  <span className="text-muted-foreground">The Free School Foundation</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}

      {/* SECTION 5: ANNOUNCEMENTS */}
      {section === "announcements" && (
        <Panel
          title="Campaign Announcements & Timeline"
          description="Public broadcasts and historical audit timeline for your scholarship batch."
        >
          <div className="space-y-4">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-brand-orange" />
                  <h2 className="font-bold">{item.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)} • {item.audience}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
              <CalendarDays className="h-4 w-4 text-brand-green" /> Official Audit Timeline
            </h2>
            <ol className="mt-4 space-y-3">
              {[...application.history].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">{entry.status}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.at)} • {entry.by}
                    </p>
                    {entry.comment && (
                      <p className="mt-1 text-xs text-muted-foreground">{entry.comment}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      )}
    </PortalLayout>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="mt-6 border-t border-border pt-6">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

function LabelButton({ onFile }: { onFile: (file: File) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="w-full sm:w-auto sm:text-right">
      <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-brand-green px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-green-dark sm:w-auto">
        <Upload className="mr-2 h-4 w-4" />
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setError("");
            void onFile(file)
              .catch((uploadError: unknown) =>
                setError(
                  uploadError instanceof Error ? uploadError.message : "Upload failed. Try again.",
                ),
              )
              .finally(() => setUploading(false));
          }}
        />
        {uploading ? "Uploading…" : "Upload Certificate"}
      </label>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
