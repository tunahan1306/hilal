import type { ReportStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  brand: "bg-brand-soft text-brand",
} as const;

export function StatusBadge({ tone = "neutral", children, className }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

export const PROFILE_STATUS_TONE = {
  draft: "neutral",
  in_review: "warning",
  published: "success",
  unpublished: "danger",
  archived: "neutral",
} as const;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Açık",
  in_review: "İnceleniyor",
  resolved: "Kaldırıldı",
  rejected: "Reddedildi",
  appealed: "İtiraz edildi",
};
export const REPORT_STATUS_TONE = { open: "danger", in_review: "warning", resolved: "success", rejected: "neutral", appealed: "warning" } as const;

