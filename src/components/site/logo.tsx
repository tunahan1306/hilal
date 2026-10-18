import Link from "next/link";
import { cn } from "@/lib/utils";

/** Hilal işareti: ince bir hilal + serif kelime marka. */
export function CrescentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-6", className)} aria-hidden>
      <path fill="var(--brass)" d="M19.5 3.2A13 13 0 1 0 28.8 22 11 11 0 1 1 19.5 3.2Z" />
    </svg>
  );
}

export function Logo({ className, href, label = "Hilal" }: { className?: string; href: string; label?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 rounded-sm", className)} aria-label={label}>
      <CrescentMark className="size-[22px] transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:-rotate-12" />
      <span className="font-display text-[1.375rem] leading-none tracking-[-0.02em]">Hilal</span>
    </Link>
  );
}
