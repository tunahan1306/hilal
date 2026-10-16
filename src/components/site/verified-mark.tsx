import { cn } from "@/lib/utils";

/** Kimlik doğrulaması işareti — yalnızca onaylı kimlik doğrulaması kaydı varsa gösterilir. */
export function VerifiedMark({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-brand", className)} title="Kimliği doğrulanmış profil">
      <svg viewBox="0 0 16 16" className="size-[0.95rem]" role="img" aria-label={withLabel ? undefined : "Kimliği doğrulanmış"} aria-hidden={withLabel || undefined}>
        <path fill="currentColor" d="M8 .8 9.9 2.3l2.4-.2.7 2.3 2 1.4-.8 2.2.8 2.2-2 1.4-.7 2.3-2.4-.2L8 15.2l-1.9-1.5-2.4.2-.7-2.3-2-1.4.8-2.2-.8-2.2 2-1.4.7-2.3 2.4.2Z" />
        <path fill="none" stroke="var(--background)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="m5.2 8.1 1.9 1.9 3.8-3.9" />
      </svg>
      {withLabel ? <span className="text-sm">Kimliği doğrulandı</span> : null}
    </span>
  );
}
