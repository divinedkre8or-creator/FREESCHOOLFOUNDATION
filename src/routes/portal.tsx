import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";
import { PortalLayout, type PortalSection } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, fullName, STATUS_COPY } from "@/lib/fsf";
import { useCurrentApplication, useStore } from "@/lib/store";
import {
  loadMyApplication,
  markMessageRead,
  uploadRequestedDocument,
} from "@/lib/supabase/applications";

export const Route = createFileRoute("/portal")({ component: PortalPage });

function PortalPage() {
  const [section, setSection] = useState<PortalSection>("overview");
  const [loading, setLoading] = useState(true);
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

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30">Loading portal…</div>
    );

  if (!application)
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 px-5">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-extrabold">Sign in to your application</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your private application information is available after you verify your access.
          </p>
          <Button asChild className="mt-6">
            <Link to="/login">Applicant login</Link>
          </Button>
        </div>
      </div>
    );

  const copy = STATUS_COPY[application.status];
  const urgentMessage = unreadMessages.find((message) => message.priority === "high");

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
      {section === "overview" && (
        <div>
          <p className="text-sm font-semibold text-brand-orange">Applicant portal</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            Welcome, {application.personal.firstName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here is the latest information about your scholarship application.
          </p>
          {urgentMessage && (
            <button
              type="button"
              onClick={() => void openMessages()}
              className="mt-5 flex w-full items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-red-950"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span className="min-w-0">
                <span className="block text-xs font-extrabold uppercase tracking-wide text-red-700">
                  Important message
                </span>
                <span className="mt-1 block font-bold">{urgentMessage.subject}</span>
                <span className="mt-1 block text-sm">
                  Open now to read the Foundation's update.
                </span>
              </span>
            </button>
          )}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft sm:mt-7 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div>
                <StatusBadge status={application.status} />
                <h2 className="mt-4 text-xl font-bold">{copy.applicant}</h2>
              </div>
              <span className="rounded-lg bg-secondary px-3 py-2 font-mono text-sm font-bold">
                {application.appNumber}
              </span>
            </div>
            <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <Info label="Programme" value={application.programme} />
              <Info label="Level" value={application.level} />
              <Info label="Submitted" value={formatDate(application.submittedAt)} />
            </div>
          </section>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5">
              <AlertCircle className="h-5 w-5 text-brand-orange" />
              <h2 className="mt-3 font-bold">Next action</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy.next}</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <MessageSquare className="h-5 w-5 text-brand-green" />
              <h2 className="mt-3 font-bold">Latest message</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {application.messages[0]?.subject ?? "No messages yet"}
              </p>
              <button
                onClick={() => setSection("messages")}
                className="mt-3 text-sm font-bold text-brand-green-dark"
              >
                View messages
              </button>
            </section>
          </div>
        </div>
      )}
      {section === "application" && (
        <Panel
          title="My submitted application"
          description="The information received by the Foundation."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Info label="Full name" value={fullName(application)} />
            <Info label="Application number" value={application.appNumber} />
            <Info label="Email" value={application.personal.email} />
            <Info label="Phone" value={application.personal.phone} />
            <Info label="Programme" value={application.programme} />
            <Info label="Qualification" value={application.level} />
            <Info label="State of residence" value={application.personal.stateOfResidence} />
            <Info label="Employment" value={application.scholarship.employmentStatus} />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="font-bold">Why I applied</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {application.scholarship.reason}
            </p>
          </div>
        </Panel>
      )}
      {section === "documents" && (
        <Panel
          title="Documents"
          description="Uploaded documents and anything the Foundation still needs."
        >
          <div className="space-y-3">
            {application.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 gap-3">
                  <FileText className="h-5 w-5 text-brand-green" />
                  <div>
                    <p className="break-words font-semibold">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploaded
                        ? `Uploaded ${formatDate(doc.uploadedAt)}`
                        : "Requested by the Foundation"}
                    </p>
                  </div>
                </div>
                {doc.uploaded ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-green-dark">
                    <CheckCircle2 className="h-4 w-4" />
                    {doc.scanStatus === "clean"
                      ? "Security checked"
                      : doc.scanStatus === "rejected"
                        ? "Rejected"
                        : "Security scan pending"}
                  </span>
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
            ))}
          </div>
        </Panel>
      )}
      {section === "messages" && (
        <Panel
          title="Messages"
          description="Official updates remain here so you can return to them."
        >
          <div className="space-y-3">
            {application.messages.length === 0 && (
              <p className="rounded-xl bg-secondary p-5 text-sm text-muted-foreground">
                You do not have any messages yet.
              </p>
            )}
            {application.messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-xl border p-4 ${message.priority === "high" ? "border-red-200 bg-red-50/60" : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-bold">{message.subject}</h2>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(message.sentAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message.body}</p>
                <p className="mt-3 text-xs font-semibold text-brand-green-dark">
                  Sent via {message.channel}
                </p>
              </article>
            ))}
          </div>
        </Panel>
      )}
      {section === "announcements" && (
        <Panel title="Announcements" description="News for your scholarship campaign.">
          <div className="space-y-3">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-xl border border-border p-4">
                <Bell className="h-5 w-5 text-brand-orange" />
                <h2 className="mt-3 font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)} · {item.audience}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-7">
            <h2 className="font-bold">Application timeline</h2>
            <ol className="mt-4 space-y-4">
              {[...application.history].reverse().map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-brand-green" />
                  <div>
                    <p className="text-sm font-bold">{entry.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.at)} · {entry.by}
                    </p>
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-7">
      <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
function LabelButton({ onFile }: { onFile: (file: File) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="sm:text-right">
      <label className="inline-flex cursor-pointer items-center rounded-md bg-brand-green px-3 py-2 text-xs font-bold text-white">
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
        {uploading ? "Uploading…" : "Upload"}
      </label>
      {error && <p className="mt-2 max-w-56 text-xs text-destructive">{error}</p>}
    </div>
  );
}
