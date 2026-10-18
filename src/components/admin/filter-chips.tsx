import Link from "next/link";

/** Yönetim listeleri için durum filtresi (bağlantı tabanlı; URL paylaşılabilir). */
export function FilterChips({ label, items, active }: { label: string; items: { key: string | undefined; label: string; href: string; count?: number }[]; active: string | undefined }) {
  return (
    <nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.key ?? "all"}
          href={it.href}
          prefetch={false}
          aria-current={active === it.key ? "page" : undefined}
          className="inline-flex min-h-9 items-center rounded-md border border-hairline px-3 text-sm transition-colors hover:border-foreground/40 aria-[current=page]:border-foreground aria-[current=page]:font-medium"
        >
          {it.label}
          {it.count !== undefined ? <span className="ml-1.5 tabular-nums text-muted-foreground">{it.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
