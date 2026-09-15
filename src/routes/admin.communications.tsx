import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { sendPortalMessage } from "@/lib/supabase/applications";
import { sendPlatformEmail } from "@/lib/email/platform-email";

export const Route = createFileRoute("/admin/communications")({ component: CommunicationsPage });

function CommunicationsPage() {
  const { applications } = useStore();
  const [audience, setAudience] = useState("All applicants");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const recipients = useMemo(
    () =>
      audience === "All applicants"
        ? applications.filter((app) => app.status !== "Draft")
        : applications.filter((app) => app.status === audience),
    [applications, audience],
  );

  const send = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const count = await sendPortalMessage({
        applicationIds: recipients.map((item) => item.id),
        subject,
        body,
        priority,
      });
      try {
        await sendPlatformEmail({
          applicationIds: recipients.map((item) => item.id),
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-bold text-brand-orange">Communication centre</p>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Applicant communications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Target a status group, preview the audience, and deliver the same update by portal and
        email.
      </p>
      <section className="mt-7 max-w-3xl rounded-2xl border border-border bg-card p-5 md:p-7">
        <div className="flex items-center gap-2 rounded-lg bg-brand-green-soft p-3 text-sm font-bold text-brand-green-dark">
          <MessageSquare className="h-4 w-4" /> Portal and email message
        </div>
        <div className="mt-6 space-y-5">
          <label className="block text-sm font-bold">
            Audience
            <select
              className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
            >
              <option>All applicants</option>
              {STATUSES.filter((status) => status !== "Draft").map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
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
          <label className="block text-sm font-bold">
            Subject
            <Input
              className="mt-2 h-11 font-normal"
              maxLength={180}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="block text-sm font-bold">
            Message
            <Textarea
              className="mt-2 min-h-40 font-normal"
              maxLength={5000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <div className="rounded-xl border border-brand-orange/30 bg-brand-orange-soft p-4">
            <p className="text-sm font-bold text-brand-orange">Recipient preview</p>
            <p className="mt-1 text-sm">
              This will reach <strong>{recipients.length} applicants</strong> in “{audience}”.
            </p>
          </div>
          {priority === "high" && (
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
            disabled={sending || !subject.trim() || !body.trim() || recipients.length === 0}
            onClick={() => void send()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending…" : "Send portal and email update"}
          </Button>
        </div>
      </section>
    </div>
  );
}
