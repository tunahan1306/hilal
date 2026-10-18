import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { COUNTRIES, COUNTRY_CODES, countryName } from "@/domain/countries";
import { LOCATION_SOURCES } from "@/domain/locations";
import { fmt } from "@/i18n/config";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { getLocationDirectory } from "@/server/queries/locations";
import { getLocationCounts, profileCountFor } from "@/server/queries/public";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return i18nPageMeta(lang, "cities", undefined, m.cities.metaTitle, m.cities.metaDescription);
}

/** Ülke → bölge dizini. Profil sayısı olan bölgeler öne çıkar; tüm bölgeler ülke sayfasında. */
export default async function CitiesPage() {
  const [{ lang, m }, { listProvinces }, counts] = await Promise.all([getI18n(), getLocationDirectory(), getLocationCounts()]);
  const active = listProvinces().filter((p) => profileCountFor(counts, p.plate) > 0).length;
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: m.cities.title, href: localizedPath(lang, "cities") }]} />
      <header className="mb-14 mt-8 grid gap-6 border-b border-hairline pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow text-muted-foreground">{fmt(m.cities.eyebrow, { n: COUNTRY_CODES.length })}</p>
          <h1 className="font-display mt-4 text-display-xl">{m.cities.title}</h1>
        </div>
        <p className="max-w-[44ch] text-lede text-muted-foreground lg:col-span-5 lg:justify-self-end">{fmt(m.cities.lead, { n: active })}</p>
      </header>
      <div className="grid gap-x-12 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {COUNTRY_CODES.map((country) => {
          const provinces = listProvinces(country);
          return (
            <section key={country} aria-labelledby={`c-${country}`}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id={`c-${country}`} className="font-display text-display-sm">
                  <Link href={localizedPath(lang, "location", { country })} className="underline-offset-[6px] decoration-1 hover:underline">{countryName(country, lang)}</Link>
                </h2>
                <span className="text-xs text-muted-foreground">{fmt(m.cities.countryEyebrow, { n: provinces.length })}</span>
              </div>
              <ul className="max-h-[28rem] overflow-y-auto border-t border-foreground/80 [scrollbar-width:thin]">
                {provinces.map((p) => {
                  const n = profileCountFor(counts, p.plate);
                  return (
                    <li key={p.slug} className="border-b border-hairline">
                      <Link href={localizedPath(lang, "location", { country, region: p.slug })} className="group grid min-h-11 grid-cols-[2rem_1fr_auto] items-center gap-2 py-2 text-[0.9375rem]">
                        <span className="text-xs tabular-nums text-muted-foreground">{COUNTRIES[country].showPlate ? String(p.plate).padStart(2, "0") : ""}</span>
                        <span className={n ? "transition-transform group-hover:translate-x-1" : "text-muted-foreground transition-transform group-hover:translate-x-1"}>{p.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{n ? fmt(m.common.profiles, { n }) : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <section className="mt-14 border-t border-hairline pt-6 text-xs text-muted-foreground" aria-labelledby="kaynaklar">
        <h2 id="kaynaklar" className="font-medium text-foreground">{m.cities.sourcesTitle}</h2>
        <p className="mt-2 max-w-[72ch]">{m.cities.sourcesNote}</p>
        <ul className="mt-3 grid gap-1.5">
          {LOCATION_SOURCES.map((s) => (
            <li key={s.name} lang={s.name.startsWith("Wikidata") ? "en" : s.country} className="break-words">
              <span className="uppercase">{s.country}</span> · {"url" in s ? <a href={s.url} rel="noopener" className="underline underline-offset-2">{s.name}</a> : s.name}
              {"license" in s ? <> · {LICENSE_URL[s.license.split(" (")[0]!] ? <a href={LICENSE_URL[s.license.split(" (")[0]!]} rel="license noopener" className="underline underline-offset-2">{s.license}</a> : s.license}</> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Lisans metinleri (atıf zorunluluğu: CC BY 4.0 ve dl-de/by-2-0 kaynak, lisans ve değişiklik bildirimi ister). */
const LICENSE_URL: Record<string, string> = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "Datenlizenz Deutschland – Namensnennung – Version 2.0": "https://www.govdata.de/dl-de/by-2-0",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
};
