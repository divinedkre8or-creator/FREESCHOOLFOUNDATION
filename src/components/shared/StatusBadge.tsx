import { STATUS_COPY, type ApplicationStatus } from "@/lib/fsf";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-brand-yellow-soft text-brand-green-dark border-brand-yellow/60",
  warning: "bg-brand-orange-soft text-brand-orange border-brand-orange/40",
  success: "bg-brand-green-soft text-brand-green-dark border-brand-green/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_NORMALIZATION: Record<string, ApplicationStatus> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  "under review": "Under Review",
  shortlisted: "Shortlisted",
  additional_documents_required: "Additional Documents Required",
  "additional documents required": "Additional Documents Required",
  approved: "Approved",
  enrolled: "Enrolled",
  not_successful: "Not Successful",
  "not successful": "Not Successful",
  rejected: "Not Successful",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus | string | null | undefined;
  className?: string;
}) {
  const normalizedKey = status ? String(status).trim() : "Draft";
  const normalizedStatus =
    STATUS_COPY[normalizedKey as ApplicationStatus]
      ? (normalizedKey as ApplicationStatus)
      : STATUS_NORMALIZATION[normalizedKey.toLowerCase()] ?? "Draft";

  const config = STATUS_COPY[normalizedStatus];
  const tone = config?.tone ?? "neutral";
  const label = config ? normalizedStatus : normalizedKey || "Unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONES[tone] || TONES["neutral"],
        className,
      )}
    >
      {label}
    </span>
  );
}

