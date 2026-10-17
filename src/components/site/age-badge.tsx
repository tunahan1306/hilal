import { cn } from "@/lib/utils";

/**
 * 18+ işareti. Yalnızca bilgilendiricidir: bir rozet veya onay kutusu yaşın
 * kanıtı değildir; profillerde yaş, yayından önce belgeyle doğrulanır
 * (bkz. SECURITY.md → Yaş güvencesi).
 */
export function AgeBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span
      role="img"
      aria-label="Yalnızca 18 yaş ve üzeri"
      title="Yalnızca 18 yaş ve üzeri"
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full border border-brass/70 font-sans font-semibold tabular-nums tracking-tight text-foreground",
        size === "sm" ? "h-6 min-w-6 px-1.5 text-[0.6875rem]" : "h-7 min-w-7 px-2 text-xs",
        className,
      )}
    >
      18+
    </span>
  );
}
