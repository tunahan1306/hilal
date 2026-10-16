import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { SeoPageForm } from "@/components/admin/simple-forms";
import { StatusBadge } from "@/components/admin/status-badge";
import { getProvince, getProvinceByPlate } from "@/domain/locations";
import { shouldIndexListing } from "@/domain/seo";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { seoPageAction } from "../actions";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  await requireAdmin();
  const repo = getRepository();
  const [pages, counts] = await Promise.all([repo.listSeoPages(), repo.countPublishedByLocation()]);
  const countFor = (path: string) => {
    const [, , il, ilce] = path.split("/");
    const p = getProvince(il ?? "");
    return p ? counts.find((c) => c.plate === p.plate && c.districtSlug === (ilce ?? null))?.count ?? 0 : 0;
  };
  const cityRows = counts
    .filter((c) => c.districtSlug === null)
    .sort((a, b) => b.count - a.count)
    .map((c) => `/sehir/${getProvinceByPlate(c.plate)!.slug}`);

  return (
    <>
      <PageHeader
        title="SEO yönetimi"
        description="İl ve ilçe sayfaları yalnızca yeterli profil (≥3) veya özgün tanıtım metni varsa indekslenir. Filtrelenmiş varyantlar her zaman noindex'tir."
      />
      <section className="mb-8 rounded-lg border border-hairline p-5">
        <h2 className="mb-4 font-semibold">Yeni sayfa ayarı</h2>
        <SeoPageForm action={seoPageAction} />
      </section>
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Kayıtlı ayarlar</h2>
        <div className="space-y-4">
          {pages.map((p) => {
            const indexed = shouldIndexListing({ profileCount: countFor(p.path), hasCuratedIntro: Boolean(p.intro), override: p.indexOverride });
            return (
              <details key={p.id} className="rounded-lg border border-hairline p-4">
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <code className="text-sm">{p.path}</code>
                  <span className="flex gap-2"><StatusBadge>{countFor(p.path)} profil</StatusBadge><StatusBadge tone={indexed ? "success" : "neutral"}>{indexed ? "index" : "noindex"}</StatusBadge></span>
                </summary>
                <div className="mt-4"><SeoPageForm action={seoPageAction} page={p} /></div>
              </details>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Profil bulunan iller</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {cityRows.map((path) => {
            const seo = pages.find((p) => p.path === path);
            const indexed = shouldIndexListing({ profileCount: countFor(path), hasCuratedIntro: Boolean(seo?.intro), override: seo?.indexOverride ?? null });
            return <li key={path} className="rounded-full border border-border px-3 py-1">{path} <span className={indexed ? "text-success" : "text-muted-foreground"}>· {indexed ? "index" : "noindex"}</span></li>;
          })}
        </ul>
      </section>
    </>
  );
}
