import Link from "next/link";
import { cacheLife } from "next/cache";
import { COUNTRY_CODES, countryName } from "@/domain/countries";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { AgeBadge } from "./age-badge";
import { CrescentMark } from "./logo";

export async function SiteFooter() {
  const { lang, m } = await getI18n();
  const f = m.footer;
  const groups = [
    {
      title: f.explore,
      links: [
        [localizedPath(lang, "explore"), f.allProfiles],
        [localizedPath(lang, "cities"), f.allCities],
        ...COUNTRY_CODES.map((c) => [localizedPath(lang, "location", { country: c }), countryName(c, lang)] as const),
      ],
    },
    { title: f.community, links: [[localizedPath(lang, "safety"), f.safety], [localizedPath(lang, "removal"), f.removal], [localizedPath(lang, "packages"), f.packages], [localizedPath(lang, "contact"), f.contact]] },
    { title: f.legal, links: [[localizedPath(lang, "privacy"), f.privacy], [localizedPath(lang, "terms"), f.terms]] },
  ];
  return (
    <footer className="mt-10 border-t border-hairline pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-6 py-9 md:grid-cols-12">
        <div className="col-span-2 md:col-span-5">
          <p className="flex items-center gap-2.5 font-display text-3xl leading-none tracking-[-0.02em]">
            <CrescentMark className="size-[0.8em]" /> Hilal
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{f.blurb}</p>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="md:col-span-2">
            <h2 className="eyebrow mb-4 text-muted-foreground">{g.title}</h2>
            <ul className="space-y-0.5 text-sm">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-10 items-center underline-offset-4 hover:underline md:min-h-8">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <AgeBadge label={m.common.adultsOnly} /> {f.adultsNote}
          </p>
          <p>© <CopyrightYear /> Hilal</p>
        </div>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
