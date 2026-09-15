import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText, Mail, MessageSquare, NotebookPen, Phone, Save } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, formatDate, formatDateTime, fullName, type ApplicationStatus } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { sendPlatformEmail } from "@/lib/email/platform-email";
import {
  addApplicationNote,
  changeApplicationStatus,
  loadAdminApplications,
  requestApplicationDocument,
  sendPortalMessage,
} from "@/lib/supabase/applications";

export const Route = createFileRoute("/admin/applicants/$applicationId")({
  component: ApplicantProfile,
});
function ApplicantProfile() {
  const { applicationId } = Route.useParams();
  const { applications, setState } = useStore();
  const application = applications.find((item) => item.id === applicationId);
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? "Submitted");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [messagePriority, setMessagePriority] = useState<"normal" | "high">("normal");
  const [documentType, setDocumentType] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

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
  if (!application)
    return (
      <div>
        <h1 className="text-2xl font-extrabold">Applicant not found</h1>
        <Button asChild className="mt-5">
          <Link to="/admin/applicants">Back to applicants</Link>
        </Button>
      </div>
    );
  return (
    <div>
      <Link
        to="/admin/applicants"
        className="inline-flex items-center text-sm font-bold text-brand-green-dark"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        All applicants
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-sm font-bold text-muted-foreground">
            {application.appNumber}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{fullName(application)}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-start gap-1 break-all">
              <Mail className="h-4 w-4" />
              {application.personal.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {application.personal.phone}
            </span>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <ProfileSection title="Application information">
            <InfoGrid
              values={[
                ["Programme", application.programme],
                ["Qualification", application.level],
                ["Submitted", formatDate(application.submittedAt)],
                ["Campaign", application.campaign],
              ]}
            />
          </ProfileSection>
          <ProfileSection title="Personal information">
            <InfoGrid
              values={[
                ["Date of birth", formatDate(application.personal.dob)],
                ["State of residence", application.personal.stateOfResidence],
                ["State of origin", application.personal.stateOfOrigin],
                ["Address", application.personal.address],
              ]}
            />
          </ProfileSection>
          <ProfileSection title="Educational background">
            <InfoGrid
              values={Object.entries(application.education).map(([key, value]) => [
                key.replace(/([A-Z])/g, " $1"),
                value ?? "—",
              ])}
            />
          </ProfileSection>
          <ProfileSection title="Scholarship responses">
            <h3 className="text-sm font-bold">Why they applied</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {application.scholarship.reason}
            </p>
            <h3 className="mt-5 text-sm font-bold">Education and career goals</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {application.scholarship.goals}
            </p>
          </ProfileSection>
          <ProfileSection title="Documents">
            <div className="space-y-3">
              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col items-stretch justify-between gap-4 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 text-brand-green" />
                    <span>
                      <strong className="block break-words text-sm">{doc.name}</strong>
                      <small className="text-muted-foreground">{doc.type}</small>
                    </span>
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {doc.scanStatus === "clean"
                      ? "Security checked"
                      : doc.scanStatus === "rejected"
                        ? "Rejected"
                        : doc.uploaded
                          ? "Quarantined"
                          : "Awaiting upload"}
                  </span>
                </div>
              ))}
            </div>
          </ProfileSection>
          <ProfileSection title="Application history">
            <ol className="space-y-4">
              {[...application.history].reverse().map((entry) => (
                <li key={entry.id} className="border-l-2 border-brand-green pl-4">
                  <p className="text-sm font-bold">{entry.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.at)} by {entry.by}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.comment}</p>
                  )}
                </li>
              ))}
            </ol>
          </ProfileSection>
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Review decision</h2>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Application status
              <select
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {STATUSES.filter((item) => item !== "Draft").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Button
              className="mt-4 w-full"
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
                    return "Status updated, but its email could not be sent. Check Resend configuration and retry from Communications.";
                  }
                  return undefined;
                }, "Application status updated.")
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Update status
            </Button>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <NotebookPen className="h-5 w-5 text-brand-orange" />
            <h2 className="mt-3 font-bold">Internal notes</h2>
            <p className="mt-1 text-xs text-muted-foreground">Never visible to applicants.</p>
            <Textarea
              className="mt-4"
              placeholder="Add a review note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={!note.trim()}
              onClick={() =>
                void runAction(async () => {
                  await addApplicationNote(application.id, note);
                  setNote("");
                }, "Private note saved.")
              }
            >
              Add private note
            </Button>
            <div className="mt-4 space-y-3">
              {application.notes.map((item) => (
                <div key={item.id} className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-sm">{item.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.author} · {formatDate(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <MessageSquare className="h-5 w-5 text-brand-green" />
            <h2 className="mt-3 font-bold">Send a message</h2>
            <Textarea
              className="mt-4"
              placeholder="Write an applicant update"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <select
              aria-label="Message priority"
              className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={messagePriority}
              onChange={(event) => setMessagePriority(event.target.value as "normal" | "high")}
            >
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
            </select>
            <Button
              className="mt-3 w-full"
              disabled={saving || !message.trim()}
              onClick={() =>
                void runAction(async () => {
                  await sendPortalMessage({
                    applicationIds: [application.id],
                    subject: "Application update",
                    body: message,
                    priority: messagePriority,
                  });
                  try {
                    await sendPlatformEmail({
                      applicationIds: [application.id],
                      event: "message",
                      subject: "Application update",
                      body: message,
                    });
                  } catch {
                    setMessage("");
                    return "Portal notification sent, but its email could not be sent.";
                  }
                  setMessage("");
                  return undefined;
                }, "Portal notification and email sent.")
              }
            >
              Send portal message
            </Button>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <FileText className="h-5 w-5 text-brand-orange" />
            <h2 className="mt-3 font-bold">Request a document</h2>
            <input
              className="mt-4 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="e.g. Birth certificate"
              maxLength={120}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            />
            <Button
              variant="outline"
              className="mt-3 w-full"
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
                    return "Document request added to the portal, but its email could not be sent.";
                  }
                  setDocumentType("");
                  return undefined;
                }, "Document request added and email sent.")
              }
            >
              Request document
            </Button>
          </section>
          {feedback && (
            <p role="status" className="rounded-xl bg-secondary p-4 text-sm font-semibold">
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
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
function InfoGrid({ values }: { values: (string | undefined)[][] }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-bold">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
