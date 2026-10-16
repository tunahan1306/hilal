import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { listProvinces } from "@/domain/locations";
import { getLocationCounts, profileCountFor } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Türkiye'nin 81 ili",
  description: "Türkiye'nin 81 ilinde ve ilçelerinde doğrulanmış sosyal profilleri bölge bölge keşfedin.",
  alternates: { canonical: "/sehirler" },
};

export default async function CitiesPage() {
  const counts = await getLocationCounts();
  const byRegion = new Map<string, ReturnType<typeof listProvinces>>();
  for (const p of listProvinces()) byRegion.set(p.region, [...(byRegion.get(p.region) ?? []), p]);
  const regions = [...byRegion.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
  const active = listProvinces().filter((p) => profileCountFor(counts, p.plate) > 0).length;

  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: "Şehirler", href: "/sehirler" }]} />
      <header className="mb-14 mt-8 grid gap-6 border-b border-hairline pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow text-muted-foreground">İndeks · 7 bölge</p>
          <h1 className="font-display mt-4 text-display-xl">81 il</h1>
        </div>
        <p className="max-w-[44ch] text-lede text-muted-foreground lg:col-span-5 lg:justify-self-end">
          Şu anda {active} ilde yayında profil var. Profil sayıları anlık güncellenir; profili olmayan iller arama motorlarına gösterilmez.
        </p>
      </header>
      <div className="grid gap-x-12 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {regions.map(([region, provinces]) => (
          <section key={region} aria-labelledby={`r-${region}`}>
            <h2 id={`r-${region}`} className="font-display mb-4 text-display-sm">{region}</h2>
            <ul className="border-t border-foreground/80">
              {provinces.map((p) => {
                const n = profileCountFor(counts, p.plate);
                return (
                  <li key={p.slug} className="border-b border-hairline">
                    <Link href={`/sehir/${p.slug}`} className="group grid min-h-11 grid-cols-[2rem_1fr_auto] items-center gap-2 py-2 text-[0.9375rem]">
                      <span className="text-xs tabular-nums text-muted-foreground">{String(p.plate).padStart(2, "0")}</span>
                      <span className={n ? "transition-transform group-hover:translate-x-1" : "text-muted-foreground transition-transform group-hover:translate-x-1"}>{p.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{n ? `${n} profil` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
