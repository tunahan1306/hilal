import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "@/domain/filters";
import { cn } from "@/lib/utils";

export function Pagination({ page, total, hrefFor }: { page: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const linkCls = "inline-flex size-10 items-center justify-center rounded-md text-sm tabular-nums transition-colors hover:bg-secondary";
  return (
    <nav aria-label="Sayfalama" className="mt-16 flex items-center justify-center gap-1 border-t border-hairline pt-8">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkCls} aria-label="Önceki sayfa" rel="prev"><ChevronLeft className="size-4" aria-hidden /></Link>
      ) : null}
      {items.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - items[i - 1] > 1 ? <span className="px-1 text-muted-foreground" aria-hidden>…</span> : null}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(linkCls, p === page && "bg-primary text-primary-foreground hover:bg-primary")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={linkCls} aria-label="Sonraki sayfa" rel="next"><ChevronRight className="size-4" aria-hidden /></Link>
      ) : null}
    </nav>
  );
}
