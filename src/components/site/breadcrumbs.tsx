import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbJsonLd } from "@/domain/seo";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href: string };

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { lang, m } = await getI18n();
  const all = [{ name: m.common.home, href: localizedPath(lang, "home") }, ...items];
  return (
    <>
      <nav aria-label={m.common.breadcrumb} className="text-[0.8125rem] text-muted-foreground">
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
