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

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "Şehirler", href: "/sehirler" }]} />
      <header className="mb-10 mt-4">
        <h1 className="text-3xl font-semibold sm:text-4xl">Türkiye&apos;nin 81 ili</h1>
        <p className="mt-2 text-muted-foreground">Bölgelere göre gruplandırılmış iller. Profil sayıları anlık olarak güncellenir.</p>
      </header>
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {regions.map(([region, provinces]) => (
          <section key={region} aria-labelledby={`r-${region}`}>
            <h2 id={`r-${region}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{region}</h2>
            <ul className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-card">
              {provinces.map((p) => {
                const n = profileCountFor(counts, p.plate);
                return (
                  <li key={p.slug}>
                    <Link href={`/sehir/${p.slug}`} className="flex min-h-11 items-center justify-between px-4 text-sm hover:bg-accent">
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-xs tabular-nums text-muted-foreground">{String(p.plate).padStart(2, "0")}</span>
                        {p.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{n ? `${n} profil` : ""}</span>
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
