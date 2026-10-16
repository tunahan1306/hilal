import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-md font-semibold tracking-tight", className)} aria-label="Hilal ana sayfa">
      <svg viewBox="0 0 24 24" className="size-6 text-brand" aria-hidden>
        <path fill="currentColor" d="M14.5 2.5a9.5 9.5 0 1 0 7 15.9A8 8 0 1 1 14.5 2.5Z" />
      </svg>
      <span className="text-[1.05rem]">Hilal</span>
    </Link>
  );
}
