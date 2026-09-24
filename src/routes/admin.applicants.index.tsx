import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Mail,
  Phone,
  PhoneCall,
  RotateCcw,
  Search,
  Send,
  Smartphone,
  Sparkles,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROGRAMMES, STATUSES, formatDate, fullName } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import {
  loadAdminApplications,
  loadRegisteredUsers,
  type RegisteredUser,
} from "@/lib/supabase/applications";
import { sendRegisteredUsersEmail } from "@/lib/email/platform-email";

export const Route = createFileRoute("/admin/applicants/")({
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { applications, setState } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"applications" | "registered">("applications");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [registeredFilter, setRegisteredFilter] = useState<"all" | "unapplied" | "drafts" | "submitted">("all");
  const [selectedRegUserIds, setSelectedRegUserIds] = useState<string[]>([]);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderTargetUsers, setReminderTargetUsers] = useState<RegisteredUser[]>([]);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [level, setLevel] = useState("All");
  const [programme, setProgramme] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneTargetCategory, setPhoneTargetCategory] = useState<
    | "current_filter"
    | "selected_only"
    | "all_registered"
    | "unapplied"
    | "drafts"
    | "submitted"
    | "under_review"
    | "shortlisted"
    | "approved"
    | "docs_needed"
  >("current_filter");
  const [phoneProgrammeFilter, setPhoneProgrammeFilter] = useState("All");
  const [phoneLevelFilter, setPhoneLevelFilter] = useState("All");
  const [phoneFormat, setPhoneFormat] = useState<"local" | "international">("local");
  const [phoneDelimiter, setPhoneDelimiter] = useState<", " | "\n" | "; ">(", ");
  const [copiedPhoneText, setCopiedPhoneText] = useState(false);
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [bulkApproveTargetCategory, setBulkApproveTargetCategory] = useState<
    "selected_only" | "shortlisted" | "under_review" | "current_filter"
  >("selected_only");
  const [bulkApproveTimelineMessage, setBulkApproveTimelineMessage] = useState(
    "Congratulations! Your scholarship application has been approved."
  );
  const [bulkApprovePortalSubject, setBulkApprovePortalSubject] = useState(
    "Congratulations! Scholarship Application Approved"
  );
  const [bulkApprovePortalBody, setBulkApprovePortalBody] = useState(
    "Dear Candidate,\n\nWe are pleased to inform you that your application for The Free School Foundation Scholarship has been officially APPROVED.\n\nPlease log in to your portal to review your admission details, official records, and upcoming onboarding schedule."
  );
  const [bulkApproveSendEmail, setBulkApproveSendEmail] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkApproveFeedback, setBulkApproveFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchUsersAndApps = async () => {
    try {
      const [refreshedApps, users] = await Promise.all([
        loadAdminApplications(),
        loadRegisteredUsers(),
      ]);
      setState((state) => ({ ...state, applications: refreshedApps }));
      setRegisteredUsers(users);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  useEffect(() => {
    void fetchUsersAndApps();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsersAndApps();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    return {
      total: applications.length,
      underReview: applications.filter(
        (a) => a.status === "Under Review" || a.status === "Submitted",
      ).length,
      shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
      approved: applications.filter((a) => a.status === "Approved" || a.status === "Enrolled")
        .length,
      docsNeeded: applications.filter((a) => a.status === "Additional Documents Required").length,
      registeredCount: registeredUsers.length,
      unappliedCount: registeredUsers.filter(
        (u) => !u.hasApplication || u.applicationStatus === "registered_only",
      ).length,
      draftsCount: registeredUsers.filter((u) => u.applicationStatus === "draft").length,
    };
  }, [applications, registeredUsers]);

  const filtered = useMemo(
    () =>
      applications.filter((app) => {
        const haystack =
          `${fullName(app)} ${app.appNumber} ${app.personal.phone} ${app.personal.email}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (status === "All" || app.status === status) &&
          (level === "All" || app.level === level) &&
          (programme === "All" || app.programme === programme)
        );
      }),
    [applications, query, status, level, programme],
  );
  const selected = filtered.filter((app) => selectedIds.includes(app.id));
  const exportRows = selected.length > 0 ? selected : filtered;

  const filteredRegistered = useMemo(() => {
    return registeredUsers.filter((user) => {
      const haystack =
        `${user.firstName || ""} ${user.lastName || ""} ${user.email} ${user.phone || ""} ${user.applicationNumber || ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      if (!matchesQuery) return false;

      if (registeredFilter === "unapplied") {
        return !user.hasApplication || user.applicationStatus === "registered_only";
      }
      if (registeredFilter === "drafts") {
        return user.applicationStatus === "draft";
      }
      if (registeredFilter === "submitted") {
        return (
          user.hasApplication &&
          user.applicationStatus !== "registered_only" &&
          user.applicationStatus !== "draft"
        );
      }
      return true;
    });
  }, [registeredUsers, query, registeredFilter]);

  const toggle = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleFiltered = () => {
    const filteredIds = filtered.map((app) => app.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : [...new Set([...current, ...filteredIds])],
    );
  };

  const toggleRegUser = (userId: string) => {
    setSelectedRegUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const toggleAllFilteredRegUsers = () => {
    const filteredIds = filteredRegistered.map((u) => u.userId);
    const allSelected = filteredIds.every((id) => selectedRegUserIds.includes(id));
    setSelectedRegUserIds((current) =>
      allSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : [...new Set([...current, ...filteredIds])],
    );
  };

  const openReminderModal = (targets: RegisteredUser[]) => {
    if (targets.length === 0) return;
    setReminderTargetUsers(targets);
    setReminderFeedback(null);

    const hasDrafts = targets.some((u) => u.applicationStatus === "draft");
    const hasUnapplied = targets.some((u) => !u.hasApplication || u.applicationStatus === "registered_only");

    if (hasDrafts && !hasUnapplied) {
      setReminderSubject("Reminder: Finish and submit your scholarship application");
      setReminderBody(
        "Hello,\n\nYour scholarship application is currently saved as a draft. Please complete and submit all required sections before the application deadline.\n\nApplying is 100% free of charge.",
      );
    } else {
      setReminderSubject("Complete your Free School Foundation scholarship application");
      setReminderBody(
        "Hello,\n\nWe noticed you registered on the Free School Foundation scholarship portal but haven't submitted your application yet.\n\nScholarship applications are open and 100% free of charge. Please click below to complete your application today.",
      );
    }
    setReminderModalOpen(true);
  };

  const handleSendReminder = async () => {
    if (!reminderSubject.trim() || !reminderBody.trim() || reminderTargetUsers.length === 0) return;
    setReminderSending(true);
    setReminderFeedback(null);

    try {
      const userIds = reminderTargetUsers.map((u) => u.userId);
      const count = await sendRegisteredUsersEmail({
        userIds,
        subject: reminderSubject.trim(),
        body: reminderBody.trim(),
        actionUrl: `${window.location.origin}/apply`,
        actionText: "Complete Scholarship Application",
      });

      setReminderFeedback({
        type: "success",
        text: `Successfully sent email reminder to ${count} candidate${count === 1 ? "" : "s"}.`,
      });
      setSelectedRegUserIds([]);
      setTimeout(() => {
        setReminderModalOpen(false);
        setReminderFeedback(null);
      }, 2500);
    } catch (err) {
      setReminderFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to send email reminders.",
      });
    } finally {
      setReminderSending(false);
    }
  };

  const exportPhones = () => {
    const header = ["Name", "Phone", "Email", "Application Number", "Status", "Programme", "Level"];
    const rows = exportRows.map((app) => [
      fullName(app),
      app.personal.phone,
      app.personal.email,
      app.appNumber,
      app.status,
      app.programme,
      app.level,
    ]);
    const csv = [header, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fsf-applicant-phones-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAllRegistered = () => {
    const header = [
      "Email",
      "First Name",
      "Last Name",
      "Phone",
      "Email Confirmed",
      "Application Status",
      "Application Number",
      "Level",
      "Programme",
      "Registered At",
      "Last Sign In",
    ];
    const rows = registeredUsers.map((u) => [
      u.email,
      u.firstName || "",
      u.lastName || "",
      u.phone || "",
      u.emailConfirmed ? "Yes" : "No",
      u.applicationStatus,
      u.applicationNumber || "",
      u.applicationLevel || "",
      u.programmeName || "",
      u.registeredAt,
      u.lastSignInAt || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fsf-all-registered-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyAllEmails = async () => {
    const emails = [
      ...new Set(
        registeredUsers.map((u) => u.email).filter(Boolean).concat(
          applications.map((a) => a.personal.email).filter(Boolean)
        )
      ),
    ];
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 3000);
    } catch {
      // Fallback
    }
  };

  function sanitizePhoneNumber(raw: string, format: "local" | "international"): string | null {
    if (!raw) return null;
    let cleaned = raw.trim().replace(/[^\d+]/g, "");
    if (!cleaned) return null;

    if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
    }

    // Nigerian numbers
    if (cleaned.startsWith("234") && cleaned.length >= 13) {
      const rest = cleaned.slice(3);
      return format === "local" ? `0${rest}` : `+234${rest}`;
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      const rest = cleaned.slice(1);
      return format === "local" ? cleaned : `+234${rest}`;
    } else if (cleaned.length === 10 && !cleaned.startsWith("0")) {
      return format === "local" ? `0${cleaned}` : `+234${cleaned}`;
    }

    if (cleaned.length >= 8 && cleaned.length <= 15) {
      return format === "international" ? `+${cleaned}` : cleaned;
    }

    return null;
  }

  const targetedPhoneResults = useMemo(() => {
    interface PhoneRecord {
      id: string;
      name: string;
      rawPhone: string;
      cleanPhone: string;
      category: string;
      programme?: string | null;
      level?: string | null;
      email?: string;
    }

    const rawList: PhoneRecord[] = [];

    if (phoneTargetCategory === "current_filter") {
      if (activeTab === "applications") {
        filtered.forEach((app) => {
          const raw = app.personal.phone || "";
          const clean = sanitizePhoneNumber(raw, phoneFormat);
          if (clean) {
            rawList.push({
              id: app.id,
              name: fullName(app),
              rawPhone: raw,
              cleanPhone: clean,
              category: app.status,
              programme: app.programme,
              level: app.level,
              email: app.personal.email,
            });
          }
        });
      } else {
        filteredRegistered.forEach((u) => {
          const raw = u.phone || "";
          const clean = sanitizePhoneNumber(raw, phoneFormat);
          if (clean) {
            rawList.push({
              id: u.userId,
              name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
              rawPhone: raw,
              cleanPhone: clean,
              category: u.applicationStatus,
              programme: u.programmeName,
              level: u.applicationLevel,
              email: u.email,
            });
          }
        });
      }
    } else if (phoneTargetCategory === "selected_only") {
      if (activeTab === "applications") {
        const targetApps = applications.filter((a) => selectedIds.includes(a.id));
        targetApps.forEach((app) => {
          const raw = app.personal.phone || "";
          const clean = sanitizePhoneNumber(raw, phoneFormat);
          if (clean) {
            rawList.push({
              id: app.id,
              name: fullName(app),
              rawPhone: raw,
              cleanPhone: clean,
              category: app.status,
              programme: app.programme,
              level: app.level,
              email: app.personal.email,
            });
          }
        });
      } else {
        const targetUsers = registeredUsers.filter((u) => selectedRegUserIds.includes(u.userId));
        targetUsers.forEach((u) => {
          const raw = u.phone || "";
          const clean = sanitizePhoneNumber(raw, phoneFormat);
          if (clean) {
            rawList.push({
              id: u.userId,
              name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
              rawPhone: raw,
              cleanPhone: clean,
              category: u.applicationStatus,
              programme: u.programmeName,
              level: u.applicationLevel,
              email: u.email,
            });
          }
        });
      }
    } else if (
      phoneTargetCategory === "all_registered" ||
      phoneTargetCategory === "unapplied" ||
      phoneTargetCategory === "drafts"
    ) {
      registeredUsers.forEach((u) => {
        if (
          phoneTargetCategory === "unapplied" &&
          u.hasApplication &&
          u.applicationStatus !== "registered_only"
        ) {
          return;
        }
        if (phoneTargetCategory === "drafts" && u.applicationStatus !== "draft") {
          return;
        }
        if (phoneProgrammeFilter !== "All" && u.programmeName !== phoneProgrammeFilter) {
          return;
        }
        if (phoneLevelFilter !== "All" && u.applicationLevel !== phoneLevelFilter) {
          return;
        }

        const raw = u.phone || "";
        const clean = sanitizePhoneNumber(raw, phoneFormat);
        if (clean) {
          rawList.push({
            id: u.userId,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
            rawPhone: raw,
            cleanPhone: clean,
            category: u.applicationStatus,
            programme: u.programmeName,
            level: u.applicationLevel,
            email: u.email,
          });
        }
      });
    } else {
      // Filter applications by specific status
      applications.forEach((app) => {
        let matches = false;
        if (phoneTargetCategory === "submitted") matches = true;
        else if (phoneTargetCategory === "under_review")
          matches = app.status === "Under Review" || app.status === "Submitted";
        else if (phoneTargetCategory === "shortlisted")
          matches = app.status === "Shortlisted";
        else if (phoneTargetCategory === "approved")
          matches = app.status === "Approved" || app.status === "Enrolled";
        else if (phoneTargetCategory === "docs_needed")
          matches = app.status === "Additional Documents Required";

        if (!matches) return;
        if (phoneProgrammeFilter !== "All" && app.programme !== phoneProgrammeFilter) return;
        if (phoneLevelFilter !== "All" && app.level !== phoneLevelFilter) return;

        const raw = app.personal.phone || "";
        const clean = sanitizePhoneNumber(raw, phoneFormat);
        if (clean) {
          rawList.push({
            id: app.id,
            name: fullName(app),
            rawPhone: raw,
            cleanPhone: clean,
            category: app.status,
            programme: app.programme,
            level: app.level,
            email: app.personal.email,
          });
        }
      });
    }

    // Deduplicate by clean phone number
    const seen = new Set<string>();
    const uniqueRecords: PhoneRecord[] = [];
    rawList.forEach((r) => {
      if (!seen.has(r.cleanPhone)) {
        seen.add(r.cleanPhone);
        uniqueRecords.push(r);
      }
    });

    const uniqueNumbers = uniqueRecords.map((r) => r.cleanPhone);
    const textOutput = uniqueNumbers.join(phoneDelimiter);

    return {
      rawCount: rawList.length,
      uniqueCount: uniqueRecords.length,
      uniqueNumbers,
      textOutput,
      records: uniqueRecords,
    };
  }, [
    phoneTargetCategory,
    phoneProgrammeFilter,
    phoneLevelFilter,
    phoneFormat,
    phoneDelimiter,
    activeTab,
    filtered,
    filteredRegistered,
    applications,
    registeredUsers,
    selectedIds,
    selectedRegUserIds,
  ]);

  const copyTargetedPhones = async () => {
    if (!targetedPhoneResults.textOutput) return;
    try {
      await navigator.clipboard.writeText(targetedPhoneResults.textOutput);
      setCopiedPhoneText(true);
      setTimeout(() => setCopiedPhoneText(false), 3000);
    } catch {
      // Fallback
    }
  };

  const downloadTargetedPhones = () => {
    if (targetedPhoneResults.records.length === 0) return;
    const header = ["Name", "Phone", "Category", "Programme", "Level", "Email"];
    const rows = targetedPhoneResults.records.map((r) => [
      r.name,
      r.cleanPhone,
      r.category,
      r.programme || "",
      r.level || "",
      r.email || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fsf-targeted-phones-${phoneTargetCategory}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bulkApproveTargetApps = useMemo(() => {
    let targets: typeof applications = [];
    if (bulkApproveTargetCategory === "selected_only") {
      targets = applications.filter((a) => selectedIds.includes(a.id));
    } else if (bulkApproveTargetCategory === "shortlisted") {
      targets = applications.filter((a) => a.status === "Shortlisted");
    } else if (bulkApproveTargetCategory === "under_review") {
      targets = applications.filter(
        (a) => a.status === "Under Review" || a.status === "Submitted"
      );
    } else if (bulkApproveTargetCategory === "current_filter") {
      targets = filtered;
    }

    const eligible = targets.filter(
      (a) => a.status !== "Approved" && a.status !== "Enrolled"
    );
    const alreadyApproved = targets.filter(
      (a) => a.status === "Approved" || a.status === "Enrolled"
    );

    return {
      all: targets,
      eligible,
      alreadyApproved,
    };
  }, [applications, selectedIds, filtered, bulkApproveTargetCategory]);

  const handleBulkApprove = async () => {
    if (bulkApproveTargetApps.eligible.length === 0) return;
    setBulkApproving(true);
    setBulkApproveFeedback(null);

    try {
      const { adminBulkApproveApplications } = await import("@/lib/admin/admin-actions");
      const appIds = bulkApproveTargetApps.eligible.map((a) => a.id);

      const res = await adminBulkApproveApplications({
        applicationIds: appIds,
        applicantMessage: bulkApproveTimelineMessage.trim() || undefined,
        portalMessageSubject: bulkApprovePortalSubject.trim() || undefined,
        portalMessageBody: bulkApprovePortalBody.trim() || undefined,
      });

      if (bulkApproveSendEmail) {
        try {
          const { sendPlatformEmail } = await import("@/lib/email/platform-email");
          await sendPlatformEmail({
            applicationIds: appIds,
            event: "status",
          });
        } catch (emailErr) {
          console.warn("Email dispatch error during bulk approve:", emailErr);
        }
      }

      setBulkApproveFeedback({
        type: "success",
        text: `Successfully approved ${res.approvedCount} candidate${res.approvedCount === 1 ? "" : "s"} and dispatched high-priority portal notifications!`,
      });

      setSelectedIds([]);
      await fetchUsersAndApps();

      setTimeout(() => {
        setBulkApproveModalOpen(false);
        setBulkApproveFeedback(null);
      }, 2500);
    } catch (err) {
      setBulkApproveFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to bulk approve applications.",
      });
    } finally {
      setBulkApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
          Scholarship Administration
        </p>
        <div className="mt-1 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Applicant Directory & Accounts</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Inspect candidate biodata, verify documents, view all registered accounts, and export candidate contacts.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              className="bg-brand-green-dark text-white hover:bg-brand-green-dark/90 font-bold shadow-xs"
              onClick={() => {
                if (selectedIds.length > 0) {
                  setBulkApproveTargetCategory("selected_only");
                } else if (status === "Shortlisted") {
                  setBulkApproveTargetCategory("shortlisted");
                } else if (status === "Under Review" || status === "Submitted") {
                  setBulkApproveTargetCategory("under_review");
                } else {
                  setBulkApproveTargetCategory("current_filter");
                }
                setBulkApproveModalOpen(true);
              }}
            >
              <Award className="mr-2 h-4 w-4 text-brand-orange" />
              Bulk Approve
            </Button>
            <Button
              variant="outline"
              className="border-brand-green/40 hover:bg-brand-green-soft text-brand-green-dark font-bold shadow-xs"
              onClick={() => {
                if (selectedIds.length > 0 || selectedRegUserIds.length > 0) {
                  setPhoneTargetCategory("selected_only");
                } else {
                  setPhoneTargetCategory(activeTab === "registered" ? "all_registered" : "current_filter");
                }
                setPhoneModalOpen(true);
              }}
            >
              <Phone className="mr-2 h-4 w-4 text-brand-green" />
              Target & Copy Phone Numbers
            </Button>
            <Button
              variant="outline"
              onClick={() => void copyAllEmails()}
            >
              {copiedEmails ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-brand-green" />
                  Copied Emails!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All Emails
                </>
              )}
            </Button>
            <Button
              className="w-full gap-2 sm:w-auto"
              variant="outline"
              onClick={activeTab === "registered" ? exportAllRegistered : exportPhones}
            >
              <Download className="h-4 w-4" />
              {activeTab === "registered"
                ? `Export Accounts (${registeredUsers.length})`
                : `Export CSV (${selected.length > 0 ? selected.length : filtered.length})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === "applications"
              ? "border-brand-green text-brand-green-dark"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("applications")}
        >
          Applications ({applications.length})
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === "registered"
              ? "border-brand-green text-brand-green-dark"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("registered")}
        >
          All Registered User Accounts ({registeredUsers.length})
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Total Applicants" value={stats.total} icon={Users} color="text-foreground" />
        <MetricCard label="Under Review" value={stats.underReview} icon={Clock} color="text-brand-orange" />
        <MetricCard label="Shortlisted" value={stats.shortlisted} icon={CheckCircle2} color="text-emerald-600" />
        <MetricCard label="Approved / Enrolled" value={stats.approved} icon={FileCheck} color="text-brand-green" />
        <MetricCard label="Docs Needed" value={stats.docsNeeded} icon={FileText} color="text-red-500" />
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === "applications" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {/* Search & Filters */}
          <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(3,180px)]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 pl-9 text-sm"
                placeholder="Search by name, FSF code, email, or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={["All", ...STATUSES]}
              label="status"
            />
            <FilterSelect
              value={level}
              onChange={setLevel}
              options={["All", "ND"]}
              label="level"
            />
            <FilterSelect
              value={programme}
              onChange={setProgramme}
              options={["All", ...PROGRAMMES]}
              label="programme"
            />
          </div>

          {/* Filter Summary & Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/20 px-5 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 font-medium">
                <Filter className="h-3.5 w-3.5" /> Found {filtered.length} applicant{filtered.length === 1 ? "" : "s"}
              </span>
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-brand-green/15 px-2.5 py-0.5 font-bold text-brand-green-dark">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.length > 0 && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-bold text-brand-green-dark hover:underline"
                    onClick={() => {
                      setBulkApproveTargetCategory("selected_only");
                      setBulkApproveModalOpen(true);
                    }}
                  >
                    <Award className="h-3.5 w-3.5 text-brand-orange" />
                    Approve Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => {
                      setPhoneTargetCategory("selected_only");
                      setPhoneModalOpen(true);
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Copy Phones
                  </button>
                </>
              )}
              {filtered.length > 0 && (
                <button
                  type="button"
                  className="font-bold text-brand-green-dark hover:underline"
                  onClick={toggleFiltered}
                >
                  {filtered.every((app) => selectedIds.includes(app.id))
                    ? "Deselect all"
                    : "Select all filtered"}
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 text-base font-bold">No applicants found</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your query or resetting filters.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View: High-Grade Tap-Friendly Cards */}
              <div className="divide-y divide-border md:hidden">
                {filtered.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => void navigate({ to: "/admin/applicants/$applicationId", params: { applicationId: app.id } })}
                    className="cursor-pointer p-4 transition-colors hover:bg-secondary/40 active:bg-secondary/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 accent-brand-green"
                          checked={selectedIds.includes(app.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggle(app.id)}
                          aria-label={`Select ${fullName(app)}`}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-foreground hover:text-brand-green-dark">
                            {fullName(app)}
                          </p>
                          <p className="font-mono text-xs font-semibold text-brand-orange">
                            {app.appNumber || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Programme</dt>
                        <dd className="font-semibold text-foreground">{app.programme}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Qualification</dt>
                        <dd className="font-semibold text-foreground">{app.level}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Contact</dt>
                        <dd className="font-semibold text-foreground">{app.personal.phone}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Submitted</dt>
                        <dd className="font-semibold text-foreground">{formatDate(app.submittedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                      <span className="text-muted-foreground">
                        {app.documents.length} document{app.documents.length === 1 ? "" : "s"} attached
                      </span>
                      <span className="flex items-center gap-1 font-bold text-brand-green-dark">
                        Scrutinize Record <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-12 px-5 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-green"
                          checked={
                            filtered.length > 0 &&
                            filtered.every((app) => selectedIds.includes(app.id))
                          }
                          onChange={toggleFiltered}
                          aria-label="Select all filtered applicants"
                        />
                      </th>
                      <th className="px-5 py-3">Applicant & Reference</th>
                      <th className="px-5 py-3">Programme & Level</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3">Submitted</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="w-32 px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((app) => (
                      <tr
                        key={app.id}
                        onClick={() => void navigate({ to: "/admin/applicants/$applicationId", params: { applicationId: app.id } })}
                        className="cursor-pointer transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-green"
                            checked={selectedIds.includes(app.id)}
                            onChange={() => toggle(app.id)}
                            aria-label={`Select ${fullName(app)}`}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground group-hover:text-brand-green-dark">
                            {fullName(app)}
                          </p>
                          <p className="font-mono text-xs font-semibold text-brand-orange">
                            {app.appNumber || "Unassigned"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{app.programme}</p>
                          <p className="text-xs text-muted-foreground">{app.level}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-foreground">{app.personal.phone}</p>
                          <p className="text-xs text-muted-foreground">{app.personal.email}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-muted-foreground">
                          {formatDate(app.submittedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs font-bold text-brand-green-dark hover:bg-brand-green-soft hover:text-brand-green-dark"
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigate({ to: "/admin/applicants/$applicationId", params: { applicationId: app.id } });
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" /> Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {/* Header toolbar with filters and action buttons */}
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 pl-9 text-sm"
                placeholder="Search registered accounts by email, name, phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stats.unappliedCount > 0 && (
                <Button
                  size="sm"
                  className="h-10 gap-1.5 bg-brand-orange text-white hover:bg-brand-orange/90 font-bold"
                  onClick={() => {
                    const unapplied = registeredUsers.filter(
                      (u) => !u.hasApplication || u.applicationStatus === "registered_only",
                    );
                    openReminderModal(unapplied);
                  }}
                >
                  <Mail className="h-4 w-4" /> Remind All Unapplied ({stats.unappliedCount})
                </Button>
              )}

              {selectedRegUserIds.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 gap-1.5 border-brand-green-dark text-brand-green-dark hover:bg-brand-green-soft font-bold"
                  onClick={() => {
                    const selected = registeredUsers.filter((u) =>
                      selectedRegUserIds.includes(u.userId),
                    );
                    openReminderModal(selected);
                  }}
                >
                  <Mail className="h-4 w-4" /> Email Selected ({selectedRegUserIds.length})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => {
                  const emails = filteredRegistered.map((u) => u.email).join("; ");
                  void navigator.clipboard.writeText(emails);
                  setCopiedEmails(true);
                  setTimeout(() => setCopiedEmails(false), 2000);
                }}
              >
                {copiedEmails ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" /> Copied ({filteredRegistered.length})
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Emails
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sub-filter tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/15 px-4 py-2 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Filter:</span>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                registeredFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-secondary/40"
              }`}
              onClick={() => setRegisteredFilter("all")}
            >
              All ({registeredUsers.length})
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                registeredFilter === "unapplied"
                  ? "bg-brand-orange text-white"
                  : "bg-background text-muted-foreground hover:bg-secondary/40"
              }`}
              onClick={() => setRegisteredFilter("unapplied")}
            >
              Not Applied Yet ({stats.unappliedCount})
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                registeredFilter === "drafts"
                  ? "bg-amber-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-secondary/40"
              }`}
              onClick={() => setRegisteredFilter("drafts")}
            >
              Drafts ({stats.draftsCount})
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                registeredFilter === "submitted"
                  ? "bg-brand-green-dark text-white"
                  : "bg-background text-muted-foreground hover:bg-secondary/40"
              }`}
              onClick={() => setRegisteredFilter("submitted")}
            >
              Submitted ({registeredUsers.length - stats.unappliedCount - stats.draftsCount})
            </button>
          </div>

          <div className="border-b border-border bg-secondary/10 px-5 py-2.5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              Showing {filteredRegistered.length} registered candidate account{filteredRegistered.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-3">
              {selectedRegUserIds.length > 0 && (
                <>
                  <span className="font-bold text-brand-orange">
                    {selectedRegUserIds.length} candidate{selectedRegUserIds.length === 1 ? "" : "s"} selected
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-bold text-brand-green-dark hover:underline"
                    onClick={() => {
                      setPhoneTargetCategory("selected_only");
                      setPhoneModalOpen(true);
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Copy Selected Phones
                  </button>
                </>
              )}
            </div>
          </div>

          {filteredRegistered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 text-base font-bold">No registered accounts found</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search query or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all registered users"
                        className="h-4 w-4 rounded border-input text-brand-green-dark"
                        checked={
                          filteredRegistered.length > 0 &&
                          filteredRegistered.every((u) => selectedRegUserIds.includes(u.userId))
                        }
                        onChange={toggleAllFilteredRegUsers}
                      />
                    </th>
                    <th className="px-5 py-3">Account Email</th>
                    <th className="px-5 py-3">Applicant Name</th>
                    <th className="px-5 py-3">Contact Phone</th>
                    <th className="px-5 py-3">Email Status</th>
                    <th className="px-5 py-3">Application Status</th>
                    <th className="px-5 py-3">Registered Date</th>
                    <th className="w-36 px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRegistered.map((user) => {
                    const isSelected = selectedRegUserIds.includes(user.userId);
                    const isUnappliedOrDraft =
                      !user.hasApplication ||
                      user.applicationStatus === "registered_only" ||
                      user.applicationStatus === "draft";

                    return (
                      <tr
                        key={user.userId}
                        className={`transition-colors hover:bg-secondary/40 ${
                          isSelected ? "bg-brand-green-soft/30" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select candidate ${user.email}`}
                            className="h-4 w-4 rounded border-input text-brand-green-dark"
                            checked={isSelected}
                            onChange={() => toggleRegUser(user.userId)}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {user.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : "Not provided yet"}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-muted-foreground">
                          {user.phone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          {user.emailConfirmed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              <UserCheck className="h-3 w-3" /> Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              <UserX className="h-3 w-3" /> Unconfirmed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              user.applicationStatus === "submitted"
                                ? "bg-emerald-100 text-emerald-800"
                                : user.applicationStatus === "draft"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {user.applicationStatus === "submitted"
                              ? "Submitted"
                              : user.applicationStatus === "draft"
                                ? "Draft in progress"
                                : "Registered (No Draft)"}
                          </span>
                          {user.applicationNumber && (
                            <p className="font-mono text-[11px] text-brand-orange mt-0.5">
                              {user.applicationNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-muted-foreground">
                          {formatDate(user.registeredAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isUnappliedOrDraft && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs font-semibold text-brand-orange border-brand-orange/40 hover:bg-brand-orange-soft"
                                onClick={() => openReminderModal([user])}
                                title="Send reminder email to apply"
                              >
                                <Mail className="h-3.5 w-3.5" /> Remind
                              </Button>
                            )}

                            {user.applicationId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs font-bold text-brand-green-dark hover:bg-brand-green-soft"
                                onClick={() =>
                                  void navigate({
                                    to: "/admin/applicants/$applicationId",
                                    params: { applicationId: user.applicationId! },
                                  })
                                }
                              >
                                <Eye className="h-3.5 w-3.5" /> Inspect
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs text-muted-foreground"
                                onClick={() => {
                                  void navigator.clipboard.writeText(user.email);
                                }}
                                title="Copy Email"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Reminder Composer Modal */}
      {reminderModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-brand-orange-soft p-2 text-brand-orange">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">
                    Send Application Reminder Email
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Targeting <strong>{reminderTargetUsers.length}</strong> registered candidate
                    {reminderTargetUsers.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={reminderSending}
                onClick={() => setReminderModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="max-h-24 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2.5 text-xs">
                <span className="font-semibold text-foreground">Recipients: </span>
                <span className="text-muted-foreground">
                  {reminderTargetUsers
                    .map((u) => u.firstName ? `${u.firstName} (${u.email})` : u.email)
                    .join(", ")}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Subject
                </label>
                <Input
                  className="mt-1 h-10 text-sm font-normal"
                  maxLength={180}
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                  placeholder="Subject line"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Message Content
                </label>
                <Textarea
                  className="mt-1 min-h-32 text-sm font-normal"
                  maxLength={5000}
                  value={reminderBody}
                  onChange={(e) => setReminderBody(e.target.value)}
                  placeholder="Message content"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  The email will include a prominent button linking directly to the application form.
                </p>
              </div>

              {reminderFeedback && (
                <div
                  className={`rounded-lg p-3 text-xs font-bold ${
                    reminderFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {reminderFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  disabled={reminderSending}
                  onClick={() => setReminderModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-brand-green-dark text-white hover:bg-brand-green-dark/90 font-bold"
                  disabled={
                    reminderSending ||
                    !reminderSubject.trim() ||
                    !reminderBody.trim() ||
                    reminderTargetUsers.length === 0
                  }
                  onClick={() => void handleSendReminder()}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {reminderSending
                    ? "Delivering emails…"
                    : `Send to ${reminderTargetUsers.length} user${reminderTargetUsers.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target & Copy Phone Numbers Modal */}
      {phoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-green-soft p-2.5 text-brand-green-dark">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">
                    Target & Copy Phone Numbers
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Segment candidate contact numbers by category, programme, or stage for Bulk SMS & WhatsApp outreach.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPhoneModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="mt-4 space-y-4 overflow-y-auto pr-1">
              {/* Category & Segment Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  1. Choose Target Audience / Category
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { id: "current_filter", label: "Current Table View", count: activeTab === "applications" ? filtered.length : filteredRegistered.length },
                    { id: "selected_only", label: "Selected Checkboxes", count: activeTab === "applications" ? selectedIds.length : selectedRegUserIds.length },
                    { id: "all_registered", label: "All Registered Accounts", count: registeredUsers.length },
                    { id: "unapplied", label: "Unapplied Accounts", count: stats.unappliedCount },
                    { id: "drafts", label: "Draft / Incomplete", count: stats.draftsCount },
                    { id: "submitted", label: "All Applications", count: applications.length },
                    { id: "under_review", label: "Under Review / Screening", count: stats.underReview },
                    { id: "shortlisted", label: "Shortlisted Scholars", count: stats.shortlisted },
                    { id: "approved", label: "Approved & Enrolled", count: stats.approved },
                    { id: "docs_needed", label: "Action Required (Docs)", count: stats.docsNeeded },
                  ].map((cat) => {
                    const isSelected = phoneTargetCategory === cat.id;
                    const isDisabled = cat.id === "selected_only" && (activeTab === "applications" ? selectedIds.length === 0 : selectedRegUserIds.length === 0);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setPhoneTargetCategory(cat.id as any)}
                        className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all ${
                          isDisabled
                            ? "opacity-40 cursor-not-allowed border-border bg-secondary/10"
                            : isSelected
                              ? "border-brand-green bg-brand-green-soft text-brand-green-dark shadow-xs font-bold ring-2 ring-brand-green/30"
                              : "border-border bg-card hover:bg-secondary/40 text-foreground"
                        }`}
                      >
                        <span className="text-xs">{cat.label}</span>
                        <span className={`mt-1 text-[11px] font-semibold ${isSelected ? "text-brand-green-dark" : "text-muted-foreground"}`}>
                          {cat.count} record{cat.count === 1 ? "" : "s"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Filters (Programme & Level) */}
              {!["current_filter", "selected_only"].includes(phoneTargetCategory) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-border bg-secondary/20 p-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Filter by Programme / Department
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground"
                      value={phoneProgrammeFilter}
                      onChange={(e) => setPhoneProgrammeFilter(e.target.value)}
                    >
                      <option value="All">All Programmes (General)</option>
                      {PROGRAMMES.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Filter by Academic Level
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground"
                      value={phoneLevelFilter}
                      onChange={(e) => setPhoneLevelFilter(e.target.value)}
                    >
                      <option value="All">All Levels (ND & HND)</option>
                      <option value="ND">National Diploma (ND)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Format & Output Options */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    2. Phone Number Format
                  </label>
                  <div className="flex rounded-lg border border-border p-1 bg-secondary/30">
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        phoneFormat === "local"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPhoneFormat("local")}
                    >
                      Local 11-digit (080…)
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        phoneFormat === "international"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPhoneFormat("international")}
                    >
                      International (+234…)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    3. List Delimiter / Separator
                  </label>
                  <div className="flex rounded-lg border border-border p-1 bg-secondary/30">
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        phoneDelimiter === ", "
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPhoneDelimiter(", ")}
                    >
                      Comma (, )
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        phoneDelimiter === "\n"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPhoneDelimiter("\n")}
                    >
                      One per Line
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        phoneDelimiter === "; "
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPhoneDelimiter("; ")}
                    >
                      Semicolon (; )
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Pill Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-secondary/40 p-3 border border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Matching Dossiers</span>
                  <p className="text-base font-extrabold text-foreground">{targetedPhoneResults.rawCount}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green-dark">Valid Phone Numbers</span>
                  <p className="text-base font-extrabold text-brand-green-dark">{targetedPhoneResults.records.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Deduplicated Unique</span>
                  <p className="text-base font-extrabold text-emerald-600">{targetedPhoneResults.uniqueCount}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Missing / Blank</span>
                  <p className="text-base font-extrabold text-muted-foreground">
                    {Math.max(0, targetedPhoneResults.rawCount - targetedPhoneResults.records.length)}
                  </p>
                </div>
              </div>

              {/* Output Preview Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Formatted Phone List Preview ({targetedPhoneResults.uniqueCount} numbers)
                  </label>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Ready for Bulk SMS Gateway / WhatsApp Broadcast
                  </span>
                </div>
                <Textarea
                  readOnly
                  rows={4}
                  className="font-mono text-xs bg-secondary/20 select-all tracking-tight leading-relaxed"
                  value={targetedPhoneResults.textOutput || "No matching phone numbers found in this segment."}
                  placeholder="Extracted numbers will appear here..."
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhoneModalOpen(false)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={targetedPhoneResults.uniqueCount === 0}
                  onClick={downloadTargetedPhones}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download CSV
                </Button>

                <Button
                  className="bg-brand-green-dark text-white hover:bg-brand-green-dark/90 font-bold flex-1 sm:flex-none"
                  disabled={targetedPhoneResults.uniqueCount === 0}
                  onClick={() => void copyTargetedPhones()}
                >
                  {copiedPhoneText ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4 text-brand-orange" />
                      Copied {targetedPhoneResults.uniqueCount} Numbers!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy {targetedPhoneResults.uniqueCount} Phone Numbers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approve Applications Modal */}
      {bulkApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-green-soft p-2.5 text-brand-green-dark">
                  <Award className="h-6 w-6 text-brand-orange" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">
                    Bulk Approve Scholarship Applications
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Batch approve candidate dossiers and automatically dispatch high-priority in-platform notifications.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkApproving}
                onClick={() => setBulkApproveModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 overflow-y-auto pr-1">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  1. Target Batch Selection
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "selected_only", label: "Selected Checkboxes", count: selectedIds.length },
                    { id: "shortlisted", label: "All Shortlisted", count: stats.shortlisted },
                    { id: "under_review", label: "Under Review / Screening", count: stats.underReview },
                    { id: "current_filter", label: "Current Table View", count: filtered.length },
                  ].map((cat) => {
                    const isSelected = bulkApproveTargetCategory === cat.id;
                    const isDisabled = cat.id === "selected_only" && selectedIds.length === 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setBulkApproveTargetCategory(cat.id as any)}
                        className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all ${
                          isDisabled
                            ? "opacity-40 cursor-not-allowed border-border bg-secondary/10"
                            : isSelected
                              ? "border-brand-green bg-brand-green-soft text-brand-green-dark shadow-xs font-bold ring-2 ring-brand-green/30"
                              : "border-border bg-card hover:bg-secondary/40 text-foreground"
                        }`}
                      >
                        <span className="text-xs">{cat.label}</span>
                        <span className={`mt-1 text-[11px] font-semibold ${isSelected ? "text-brand-green-dark" : "text-muted-foreground"}`}>
                          {cat.count} candidate{cat.count === 1 ? "" : "s"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Breakdown Strip */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-3 border border-border text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total In Batch</span>
                  <p className="text-base font-extrabold text-foreground">{bulkApproveTargetApps.all.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green-dark">Eligible to Approve</span>
                  <p className="text-base font-extrabold text-brand-green-dark">{bulkApproveTargetApps.eligible.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Already Approved</span>
                  <p className="text-base font-extrabold text-muted-foreground">{bulkApproveTargetApps.alreadyApproved.length}</p>
                </div>
              </div>

              {/* Timeline Message Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  2. Status Timeline Message (Visible on Candidate Dossier)
                </label>
                <Input
                  className="h-10 text-xs font-normal"
                  value={bulkApproveTimelineMessage}
                  onChange={(e) => setBulkApproveTimelineMessage(e.target.value)}
                  placeholder="e.g. Your application has been approved for the scholarship award."
                />
              </div>

              {/* In-Platform Portal Message Notification */}
              <div className="rounded-xl border border-brand-green/30 bg-brand-green-soft/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-green-dark">
                    <CheckCircle2 className="h-4 w-4" /> In-Platform Portal Notification (Included)
                  </div>
                  <span className="rounded-full bg-brand-green-dark text-white px-2 py-0.5 text-[10px] font-extrabold">
                    HIGH PRIORITY
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Notification Subject
                  </label>
                  <Input
                    className="h-9 text-xs font-normal bg-background"
                    value={bulkApprovePortalSubject}
                    onChange={(e) => setBulkApprovePortalSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Notification Message Body
                  </label>
                  <Textarea
                    rows={3}
                    className="text-xs font-normal bg-background leading-relaxed"
                    value={bulkApprovePortalBody}
                    onChange={(e) => setBulkApprovePortalBody(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Candidates will receive an unread badge and a prominent notification banner upon logging in to their portal.
                  </p>
                </div>
              </div>

              {/* Email Toggle Option */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bulkApproveSendEmail"
                  checked={bulkApproveSendEmail}
                  onChange={(e) => setBulkApproveSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-brand-green-dark accent-brand-green"
                />
                <label htmlFor="bulkApproveSendEmail" className="text-xs font-medium text-foreground cursor-pointer">
                  Also attempt external email notifications via Resend / SMTP
                </label>
              </div>

              {/* Feedback alert */}
              {bulkApproveFeedback && (
                <div
                  className={`rounded-lg p-3 text-xs font-bold ${
                    bulkApproveFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {bulkApproveFeedback.text}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                disabled={bulkApproving}
                onClick={() => setBulkApproveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-brand-green-dark text-white hover:bg-brand-green-dark/90 font-bold"
                disabled={bulkApproving || bulkApproveTargetApps.eligible.length === 0}
                onClick={() => void handleBulkApprove()}
              >
                <Award className="mr-1.5 h-4 w-4 text-brand-orange" />
                {bulkApproving
                  ? "Approving candidates…"
                  : `Confirm & Approve ${bulkApproveTargetApps.eligible.length} Candidate${bulkApproveTargetApps.eligible.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Filter by {label}</span>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground capitalize"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "All" ? `All ${label}s` : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function safeCsvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(protectedValue)) {
    return `"${protectedValue.replace(/"/g, '""')}"`;
  }
  return protectedValue;
}
