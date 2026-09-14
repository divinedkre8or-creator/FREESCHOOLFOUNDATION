import { STATUS_COPY, type ApplicationStatus } from "@/lib/fsf";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-brand-yellow-soft text-brand-green-dark border-brand-yellow/60",
  warning: "bg-brand-orange-soft text-brand-orange border-brand-orange/40",
  success: "bg-brand-green-soft text-brand-green-dark border-brand-green/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const tone = STATUS_COPY[status].tone;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {status}
    </span>
  );
}
