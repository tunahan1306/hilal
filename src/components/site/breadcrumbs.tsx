import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbJsonLd } from "@/domain/seo";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "Ana sayfa", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Konum" className="text-[0.8125rem] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1">
                {last ? (
                  <span aria-current="page" className="text-foreground">{c.name}</span>
                ) : (
                  <Link href={c.href} className="inline-flex min-h-6 items-center rounded-sm hover:text-foreground">{c.name}</Link>
                )}
                {!last ? <ChevronRight className="size-3 opacity-60" aria-hidden /> : null}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all.map((c) => ({ name: c.name, url: `${siteUrl()}${c.href}` })))} />
    </>
  );
}

