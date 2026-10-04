import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { formatDate, RESUMPTION_BODY, RESUMPTION_SUBJECT, STATUSES } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import {
  dispatchResumptionEmailBatch,
  loadAdminApplications,
  loadRegisteredUsers,
  sendPortalMessage,
  type RegisteredUser,
} from "@/lib/supabase/applications";
import { sendPlatformEmail, sendRegisteredUsersEmail } from "@/lib/email/platform-email";

export const Route = createFileRoute("/admin/communications")({ component: CommunicationsPage });

const AUDIENCE_UNAPPLIED = "Registered Users (Not Applied Yet)";
const AUDIENCE_DRAFTS = "Registered Users (Draft in Progress)";
const AUDIENCE_PENDING_RESUMPTION = "Approved (Awaiting Resumption Notice)";
const AUDIENCE_DELIVERED_RESUMPTION = "Approved (Resumption Notice Delivered)";

function CommunicationsPage() {
  const { setState } = useStore();
  const [liveApplications, setLiveApplications] = useState<import("@/lib/fsf").Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [audience, setAudience] = useState("Approved");
  const [priority, setPriority] = useState<"normal" | "high">("high");
  const [subject, setSubject] = useState(RESUMPTION_SUBJECT);
  const [body, setBody] = useState(RESUMPTION_BODY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Cohort block dispatch states
  const [dispatchingCohort, setDispatchingCohort] = useState(false);
  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [cohortFeedback, setCohortFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPendingRoster, setShowPendingRoster] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      loadAdminApplications().then((apps) => {
        if (active) {
          setLiveApplications(apps);
          setState((prev) => ({ ...prev, applications: apps }));
          setLoadingApps(false);
        }
      }),
      loadRegisteredUsers().then((users) => {
        if (active) setRegisteredUsers(users);
      }),
    ]).catch((err) => {
      console.error("Failed to load communications audience:", err);
      if (active) setLoadingApps(false);
    });

    return () => {
      active = false;
    };
  }, [setState]);

  // Dynamic Block Partitioning
  const pendingResumptionApps = useMemo(
    () =>
      liveApplications.filter(
        (app) =>
          (app.status === "Approved" || app.status === "Enrolled") &&
          !app.personal?.resumptionEmailSent,
      ),
    [liveApplications],
  );

  const deliveredResumptionApps = useMemo(
    () =>
      liveApplications.filter(
        (app) =>
          (app.status === "Approved" || app.status === "Enrolled") &&
          Boolean(app.personal?.resumptionEmailSent),
      ),
    [liveApplications],
  );

  const rsvpConfirmedApps = useMemo(
    () =>
      deliveredResumptionApps.filter((app) =>
        Boolean(app.personal?.resumptionAttendanceConfirmed),
      ),
    [deliveredResumptionApps],
  );

  const isRegisteredAudience = audience === AUDIENCE_UNAPPLIED || audience === AUDIENCE_DRAFTS;

  const targetRegisteredUsers = useMemo(() => {
    if (audience === AUDIENCE_UNAPPLIED) {
      return registeredUsers.filter(
        (u) => !u.hasApplication || u.applicationStatus === "registered_only",
      );
    }
    if (audience === AUDIENCE_DRAFTS) {
      return registeredUsers.filter((u) => u.applicationStatus === "draft");
    }
    return [];
  }, [audience, registeredUsers]);

  const applicantRecipients = useMemo(() => {
    if (audience === AUDIENCE_PENDING_RESUMPTION) {
      return pendingResumptionApps;
    }
    if (audience === AUDIENCE_DELIVERED_RESUMPTION) {
      return deliveredResumptionApps;
    }
    if (audience === "All applicants") {
      return liveApplications.filter((app) => app.status !== "Draft");
    }
    return liveApplications.filter((app) => app.status === audience);
  }, [liveApplications, audience, pendingResumptionApps, deliveredResumptionApps]);

  const recipientCount = isRegisteredAudience
    ? targetRegisteredUsers.length
    : applicantRecipients.length;

  const handleAudienceChange = (newAudience: string) => {
    setAudience(newAudience);
    if (
      newAudience === "Approved" ||
      newAudience === "Enrolled" ||
      newAudience === AUDIENCE_PENDING_RESUMPTION ||
      newAudience === AUDIENCE_DELIVERED_RESUMPTION
    ) {
      setPriority("high");
      setSubject(RESUMPTION_SUBJECT);
      setBody(RESUMPTION_BODY);
    } else if (newAudience === AUDIENCE_UNAPPLIED) {
      if (
        !subject ||
        subject.startsWith("Complete your") ||
        subject.startsWith("Reminder:") ||
        subject.startsWith("Official Resumption")
      ) {
        setSubject("Complete your Free School Foundation scholarship application");
      }
      if (
        !body ||
        body.includes("registered on the scholarship portal") ||
        body.includes("Story Center")
      ) {
        setBody(
          "Hello,\n\nWe noticed you registered on the Free School Foundation scholarship portal but have not completed your application yet.\n\nScholarship applications are open and 100% free of charge. Please sign in and complete your application today to secure your opportunity.",
        );
      }
    } else if (newAudience === AUDIENCE_DRAFTS) {
      if (
        !subject ||
        subject.startsWith("Complete your") ||
        subject.startsWith("Reminder:") ||
        subject.startsWith("Official Resumption")
      ) {
        setSubject("Reminder: Finish and submit your scholarship application");
      }
      if (
        !body ||
        body.includes("registered on the scholarship portal") ||
        body.includes("draft") ||
        body.includes("Story Center")
      ) {
        setBody(
          "Hello,\n\nYour scholarship application is currently saved as a draft. Don't leave your application incomplete!\n\nPlease log in to your portal and submit all required steps today before the current campaign closes.",
        );
      }
    }
  };

  // Dispatch current block and cancel out
  const handleDispatchCohortBlock = async () => {
    if (pendingResumptionApps.length === 0) return;
    setDispatchingCohort(true);
    setCohortFeedback(null);
    try {
      const ids = pendingResumptionApps.map((a) => a.id);
      const res = await dispatchResumptionEmailBatch({
        applicationIds: ids,
        customSubject: RESUMPTION_SUBJECT,
        customBody: RESUMPTION_BODY,
      });

      const now = new Date().toISOString();
      const updated = liveApplications.map((app) =>
        ids.includes(app.id)
          ? {
              ...app,
              personal: {
                ...app.personal,
                resumptionEmailSent: true,
                resumptionEmailSentAt: now,
                resumptionEmailBatchId: res.batchId,
              },
            }
          : app,
      );

      setLiveApplications(updated);
      setState((prev) => ({ ...prev, applications: updated }));

      setCohortFeedback({
        type: "success",
        text: `Official resumption notice successfully dispatched to ${res.count} scholar${res.count === 1 ? "" : "s"} (${res.emailDeliveredCount} emails delivered via Resend Pro). The pending block has been canceled out.`,
      });
      setCohortModalOpen(false);
    } catch (dispatchErr) {
      setCohortFeedback({
        type: "error",
        text:
          dispatchErr instanceof Error
            ? dispatchErr.message
            : "Failed to dispatch resumption cohort.",
      });
    } finally {
      setDispatchingCohort(false);
    }
  };

  const send = async () => {
    if (!subject.trim() || !body.trim() || recipientCount === 0) return;
    setSending(true);
    setError("");
    setMessage("");

    try {
      if (isRegisteredAudience) {
        const userIds = targetRegisteredUsers.map((u) => u.userId);
        const count = await sendRegisteredUsersEmail({
          userIds,
          subject,
          body,
          actionUrl: `${window.location.origin}/apply`,
          actionText: "Complete Scholarship Application",
        });
        setSubject("");
        setBody("");
        setMessage(
          `Direct reminder email successfully delivered to ${count} registered user${count === 1 ? "" : "s"}.`,
        );
      } else {
        const count = await sendPortalMessage({
          applicationIds: applicantRecipients.map((item) => item.id),
          subject,
          body,
          priority,
        });

        const isResumptionDispatch =
          subject.toLowerCase().includes("resumption") ||
          audience === AUDIENCE_PENDING_RESUMPTION ||
          audience === "Approved";

        try {
          await sendPlatformEmail({
            applicationIds: applicantRecipients.map((item) => item.id),
            event: "message",
            subject,
            body,
          });

          // If this was a resumption dispatch, update resumptionEmailSent locally
          if (isResumptionDispatch) {
            const now = new Date().toISOString();
            const recipientIds = new Set(applicantRecipients.map((a) => a.id));
            const updated = liveApplications.map((app) =>
              recipientIds.has(app.id)
                ? {
                    ...app,
                    personal: {
                      ...app.personal,
                      resumptionEmailSent: true,
                      resumptionEmailSentAt: now,
                    },
                  }
                : app,
            );
            setLiveApplications(updated);
            setState((prev) => ({ ...prev, applications: updated }));
          }
        } catch {
          setSubject("");
          setBody("");
          setMessage(
            `Portal message sent to ${count} applicant${count === 1 ? "" : "s"}, but email delivery failed. Check Resend configuration.`,
          );
          return;
        }
        setSubject("");
        setBody("");
        setMessage(`Portal message and email sent to ${count} applicant${count === 1 ? "" : "s"}.`);
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold text-brand-orange">Communication centre</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Portal & Email Communications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage cohort resumption notices with automated block cancellation, or compose targeted
          messages by application status.
        </p>
      </div>

      {/* Hero Section: Resumption Notice & Cohort Block Manager */}
      <section className="overflow-hidden rounded-2xl border-2 border-brand-green/30 bg-card shadow-soft">
        <div className="border-b border-border/80 bg-brand-green-soft/40 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-green text-white shadow-xs">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                    Official Resumption Notice & Cohort Dispatch
                  </h2>
                  <span className="rounded-full bg-brand-green/20 px-2.5 py-0.5 text-[11px] font-extrabold text-brand-green-dark">
                    Aba Story Center
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Monitor approved students, dispatch official resumption notices, and cancel out
                  sent blocks automatically so newly approved students queue separately.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={loadingApps}
              onClick={() => {
                setLoadingApps(true);
                void loadAdminApplications().then((apps) => {
                  setLiveApplications(apps);
                  setState((prev) => ({ ...prev, applications: apps }));
                  setLoadingApps(false);
                });
              }}
              className="self-start sm:self-auto gap-1 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingApps ? "animate-spin" : ""}`} />
              Refresh Cohort
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Tiles */}
        <div className="grid gap-4 border-b border-border/80 p-5 sm:grid-cols-3 sm:p-6 bg-secondary/15">
          {/* Tile 1: Pending Resumption Block */}
          <div className="rounded-xl border border-brand-orange/30 bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-brand-orange">
                Pending Block
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                  pendingResumptionApps.length > 0
                    ? "bg-brand-orange-soft text-brand-orange border border-brand-orange/40 animate-pulse"
                    : "bg-brand-green-soft text-brand-green-dark border border-brand-green/30"
                }`}
              >
                {pendingResumptionApps.length > 0 ? (
                  <>
                    <Clock className="h-3 w-3" /> Awaiting Notice
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Block Canceled Out
                  </>
                )}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">
                {pendingResumptionApps.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Approved Scholars</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {pendingResumptionApps.length > 0
                ? "Newly approved candidates awaiting resumption mail."
                : "All currently approved candidates have received resumption notices."}
            </p>
          </div>

          {/* Tile 2: Delivered Block */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-brand-green-dark">
                Notices Delivered
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-2 py-0.5 text-[11px] font-bold text-brand-green-dark border border-brand-green/30">
                <CheckCircle2 className="h-3 w-3" /> Notified Cohort
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">
                {deliveredResumptionApps.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Scholars Notified</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Received official Resend Pro email and portal resumption instruction.
            </p>
          </div>

          {/* Tile 3: RSVP Confirmed */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-brand-green-dark">
                Aba Physical RSVP
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-2 py-0.5 text-[11px] font-bold text-brand-green-dark border border-brand-green/30">
                <Building2 className="h-3 w-3" /> Story Center
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-green-dark">
                {rsvpConfirmedApps.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Confirmed Coming</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Scholars who clicked “I Am Coming” to confirm on-ground arrival.
            </p>
          </div>
        </div>

        {/* Feedback Banner */}
        {cohortFeedback && (
          <div
            className={`p-4 text-xs sm:text-sm font-semibold border-b ${
              cohortFeedback.type === "success"
                ? "bg-brand-green-soft text-brand-green-dark border-brand-green/30"
                : "bg-destructive/10 text-destructive border-destructive/30"
            }`}
          >
            {cohortFeedback.text}
          </div>
        )}

        {/* Action Bar & Candidate Preview */}
        <div className="p-5 sm:p-6 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">
                {pendingResumptionApps.length > 0 ? (
                  <span>
                    Ready to dispatch to{" "}
                    <strong className="text-brand-orange">
                      {pendingResumptionApps.length} scholars
                    </strong>{" "}
                    in the pending block
                  </span>
                ) : (
                  <span className="text-brand-green-dark font-extrabold">
                    ✓ Pending block is completely clear. No new approvals pending dispatch.
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target resumption deadline:{" "}
                <strong className="text-foreground">Thursday, October 15, 2027</strong> at Aba Story
                Center.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {pendingResumptionApps.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPendingRoster((prev) => !prev)}
                  className="gap-1.5 text-xs font-bold"
                >
                  {showPendingRoster ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Hide Candidates
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> Preview Roster (
                      {pendingResumptionApps.length})
                    </>
                  )}
                </Button>
              )}

              <Button
                size="default"
                disabled={pendingResumptionApps.length === 0 || dispatchingCohort}
                onClick={() => setCohortModalOpen(true)}
                className={`font-bold transition-all shadow-sm ${
                  pendingResumptionApps.length > 0
                    ? "bg-brand-green text-white hover:bg-brand-green-dark"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
              >
                {dispatchingCohort ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Dispatching Cohort…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Dispatch Resumption Mail to Current Block ({pendingResumptionApps.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Pending Candidate Roster */}
          {showPendingRoster && pendingResumptionApps.length > 0 && (
            <div className="mt-4 rounded-xl border border-border overflow-hidden bg-background">
              <div className="bg-secondary/40 px-4 py-2.5 border-b border-border flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                <span>Candidate / App #</span>
                <span>Programme</span>
                <span>Status</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
                {pendingResumptionApps.map((app) => (
                  <div
                    key={app.id}
                    className="px-4 py-3 flex items-center justify-between text-xs hover:bg-secondary/20"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {app.personal?.firstName} {app.personal?.lastName}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">{app.appNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{app.programme}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {app.personal?.stateOfOrigin || "Abia"} • {app.personal?.religion || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="rounded-full bg-brand-orange-soft px-2 py-0.5 text-[10px] font-extrabold text-brand-orange border border-brand-orange/30">
                        Pending Mail
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Dialog for Block Dispatch */}
      <AlertDialog open={cohortModalOpen} onOpenChange={setCohortModalOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-extrabold">
              <Send className="h-5 w-5 text-brand-green" />
              Confirm Resumption Dispatch to Current Block
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-left">
              <p className="text-sm text-foreground">
                You are about to dispatch official resumption notices to{" "}
                <strong className="text-brand-orange font-bold">
                  {pendingResumptionApps.length} approved scholar
                  {pendingResumptionApps.length === 1 ? "" : "s"}
                </strong>
                .
              </p>
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 text-xs text-muted-foreground space-y-1.5">
                <p className="font-bold text-foreground">What happens next:</p>
                <p>
                  1. Each scholar receives an official branded email via Resend Pro instructing them
                  to prepare for on-ground arrival at Aba Story Center by October 15, 2027.
                </p>
                <p>
                  2. A high-priority banner is pinned to their portal with an interactive RSVP
                  button (<strong>Confirm Attendance / I Am Coming</strong>).
                </p>
                <p className="font-bold text-brand-green-dark">
                  3. This pending block is immediately canceled out to 0. When you approve more
                  students later, only those new approvals will queue up.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dispatchingCohort}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={dispatchingCohort}
              onClick={(e) => {
                e.preventDefault();
                void handleDispatchCohortBlock();
              }}
              className="bg-brand-green font-bold text-white hover:bg-brand-green-dark"
            >
              {dispatchingCohort ? "Dispatching…" : "Confirm & Cancel Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Standard Custom Message Composer Section */}
      <section className="max-w-3xl rounded-2xl border border-border bg-card p-5 md:p-7 shadow-xs">
        <div className="flex items-center gap-2 rounded-lg bg-brand-green-soft p-3 text-sm font-bold text-brand-green-dark">
          {isRegisteredAudience ? (
            <>
              <Mail className="h-4 w-4" /> Direct Registered User Email Reminder
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" /> Portal and email message
            </>
          )}
        </div>

        {/* Quick Template Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleAudienceChange(AUDIENCE_PENDING_RESUMPTION)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              audience === AUDIENCE_PENDING_RESUMPTION
                ? "bg-brand-orange text-white shadow-xs"
                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
            }`}
          >
            ⏳ Resumption (Pending Block: {pendingResumptionApps.length})
          </button>
          <button
            type="button"
            onClick={() => handleAudienceChange(AUDIENCE_DELIVERED_RESUMPTION)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              audience === AUDIENCE_DELIVERED_RESUMPTION
                ? "bg-brand-green text-white shadow-xs"
                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
            }`}
          >
            ✓ Resumption (Delivered: {deliveredResumptionApps.length})
          </button>
          <button
            type="button"
            onClick={() => handleAudienceChange(AUDIENCE_UNAPPLIED)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              audience === AUDIENCE_UNAPPLIED
                ? "bg-brand-green text-white shadow-xs"
                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
            }`}
          >
            ✉️ Remind Unapplied Accounts
          </button>
          <button
            type="button"
            onClick={() => handleAudienceChange(AUDIENCE_DRAFTS)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              audience === AUDIENCE_DRAFTS
                ? "bg-brand-green text-white shadow-xs"
                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
            }`}
          >
            📝 Remind Draft Applications
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-bold">
            Audience
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal"
              value={audience}
              onChange={(event) => handleAudienceChange(event.target.value)}
            >
              <optgroup label="Resumption Cohort Blocks">
                <option value={AUDIENCE_PENDING_RESUMPTION}>
                  {AUDIENCE_PENDING_RESUMPTION} ({pendingResumptionApps.length})
                </option>
                <option value={AUDIENCE_DELIVERED_RESUMPTION}>
                  {AUDIENCE_DELIVERED_RESUMPTION} ({deliveredResumptionApps.length})
                </option>
              </optgroup>
              <optgroup label="Registered Accounts (Unapplied / Incomplete)">
                <option>{AUDIENCE_UNAPPLIED}</option>
                <option>{AUDIENCE_DRAFTS}</option>
              </optgroup>
              <optgroup label="Applicants (By General Status)">
                <option>All applicants</option>
                {STATUSES.filter((status) => status !== "Draft").map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </optgroup>
            </select>
          </label>

          {!isRegisteredAudience && (
            <label className="block text-sm font-bold">
              Priority
              <select
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal"
                value={priority}
                onChange={(event) => setPriority(event.target.value as "normal" | "high")}
              >
                <option value="normal">Normal — red unread badge</option>
                <option value="high">High — badge and prominent portal banner</option>
              </select>
            </label>
          )}

          <label className="block text-sm font-bold">
            Subject
            <Input
              className="mt-2 h-11 font-normal"
              maxLength={180}
              placeholder="e.g. Official Resumption Notice & Physical Onboarding Confirmation"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="block text-sm font-bold">
            Message
            <Textarea
              className="mt-2 min-h-40 font-normal"
              maxLength={5000}
              placeholder="Write your email message here..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <div className="rounded-xl border border-brand-orange/30 bg-brand-orange-soft p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-orange">
              <Users className="h-4 w-4" /> Recipient preview
            </div>
            <p className="mt-1 text-sm">
              This will reach <strong>{recipientCount} recipient{recipientCount === 1 ? "" : "s"}</strong> in “{audience}”.
            </p>
            {isRegisteredAudience && (
              <p className="mt-1 text-xs text-muted-foreground">
                Recipients will receive a branded email containing your message and a direct button
                to complete their scholarship application.
              </p>
            )}
          </div>
          {priority === "high" && !isRegisteredAudience && (
            <p className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" /> High-priority messages show
              as a prominent banner when the applicant opens the portal.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm font-semibold text-brand-green-dark">{message}</p>}
          <Button
            size="lg"
            className="w-full sm:w-auto font-bold"
            disabled={sending || !subject.trim() || !body.trim() || recipientCount === 0}
            onClick={() => void send()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending
              ? "Sending…"
              : isRegisteredAudience
                ? `Send email reminder to ${recipientCount} user${recipientCount === 1 ? "" : "s"}`
                : `Send portal and email update to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </section>
    </div>
  );
}
