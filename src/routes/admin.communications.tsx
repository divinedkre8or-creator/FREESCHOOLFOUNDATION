import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Mail, MessageSquare, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { loadRegisteredUsers, sendPortalMessage } from "@/lib/supabase/applications";
import type { RegisteredUser } from "@/lib/supabase/applications";
import { sendPlatformEmail, sendRegisteredUsersEmail } from "@/lib/email/platform-email";

export const Route = createFileRoute("/admin/communications")({ component: CommunicationsPage });

const AUDIENCE_UNAPPLIED = "Registered Users (Not Applied Yet)";
const AUDIENCE_DRAFTS = "Registered Users (Draft in Progress)";

function CommunicationsPage() {
  const { applications } = useStore();
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [audience, setAudience] = useState("All applicants");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void loadRegisteredUsers()
      .then((users) => {
        if (active) setRegisteredUsers(users);
      })
      .catch((err) => {
        console.error("Failed to load registered users for communications:", err);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const applicantRecipients = useMemo(
    () =>
      audience === "All applicants"
        ? applications.filter((app) => app.status !== "Draft")
        : applications.filter((app) => app.status === audience),
    [applications, audience],
  );

  const recipientCount = isRegisteredAudience
    ? targetRegisteredUsers.length
    : applicantRecipients.length;

  const handleAudienceChange = (newAudience: string) => {
    setAudience(newAudience);
    if (newAudience === AUDIENCE_UNAPPLIED) {
      if (!subject || subject.startsWith("Complete your") || subject.startsWith("Reminder:")) {
        setSubject("Complete your Free School Foundation scholarship application");
      }
      if (!body || body.includes("registered on the scholarship portal")) {
        setBody(
          "Hello,\n\nWe noticed you registered on the Free School Foundation scholarship portal but have not completed your application yet.\n\nScholarship applications are open and 100% free of charge. Please sign in and complete your application today to secure your opportunity.",
        );
      }
    } else if (newAudience === AUDIENCE_DRAFTS) {
      if (!subject || subject.startsWith("Complete your") || subject.startsWith("Reminder:")) {
        setSubject("Reminder: Finish and submit your scholarship application");
      }
      if (!body || body.includes("registered on the scholarship portal") || body.includes("draft")) {
        setBody(
          "Hello,\n\nYour scholarship application is currently saved as a draft. Don't leave your application incomplete!\n\nPlease log in to your portal and submit all required steps today before the current campaign closes.",
        );
      }
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
        try {
          await sendPlatformEmail({
            applicationIds: applicantRecipients.map((item) => item.id),
            event: "message",
            subject,
            body,
          });
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
    <div>
      <p className="text-sm font-bold text-brand-orange">Communication centre</p>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Portal & Email Communications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Target applicants by review status or send direct email reminders to registered users who
        haven't applied yet.
      </p>
      <section className="mt-7 max-w-3xl rounded-2xl border border-border bg-card p-5 md:p-7">
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
        <div className="mt-6 space-y-5">
          <label className="block text-sm font-bold">
            Audience
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal"
              value={audience}
              onChange={(event) => handleAudienceChange(event.target.value)}
            >
              <optgroup label="Registered Accounts (Unapplied / Incomplete)">
                <option>{AUDIENCE_UNAPPLIED}</option>
                <option>{AUDIENCE_DRAFTS}</option>
              </optgroup>
              <optgroup label="Applicants (By Status)">
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
              placeholder="e.g. Complete your Free School Foundation scholarship application"
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
            className="w-full sm:w-auto"
            disabled={sending || !subject.trim() || !body.trim() || recipientCount === 0}
            onClick={() => void send()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending
              ? "Sending…"
              : isRegisteredAudience
                ? `Send email reminder to ${recipientCount} user${recipientCount === 1 ? "" : "s"}`
                : "Send portal and email update"}
          </Button>
        </div>
      </section>
    </div>
  );
}
