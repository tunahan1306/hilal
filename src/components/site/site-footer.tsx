import Link from "next/link";
import { cacheLife } from "next/cache";
import { AgeBadge } from "./age-badge";
import { CrescentMark } from "./logo";

const GROUPS = [
  { title: "Keşfet", links: [["/kesfet", "Tüm profiller"], ["/sehirler", "81 il"], ["/sehir/istanbul", "İstanbul"], ["/sehir/ankara", "Ankara"], ["/sehir/izmir", "İzmir"]] },
  { title: "Topluluk", links: [["/guvenlik", "Kurallar ve güvenlik"], ["/kaldirma-talebi", "Profil kaldırma"], ["/paketler", "Üyelik paketleri"], ["/iletisim", "İletişim"]] },
  { title: "Yasal", links: [["/kvkk", "KVKK aydınlatma"], ["/kullanim-kosullari", "Kullanım koşulları"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-hairline pb-20 md:pb-0">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-6 py-9 md:grid-cols-12">
        <div className="col-span-2 md:col-span-5">
          <p className="flex items-center gap-3 font-display text-[clamp(2.5rem,2rem+3vw,4rem)] leading-none tracking-[-0.03em]">
            <CrescentMark className="size-[0.7em]" /> Hilal
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Türkiye&apos;nin 81 ilinde yetişkinler için sosyal keşif. Profillerin doğrulama durumu her profilde ayrıca gösterilir.
          </p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title} className="md:col-span-2">
            <h2 className="eyebrow mb-4 text-muted-foreground">{g.title}</h2>
            <ul className="space-y-0.5 text-sm">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-8 items-center underline-offset-4 hover:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <AgeBadge /> Yalnızca 18 yaş ve üzeri. Ücretli hizmet tanıtımına izin verilmez.
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
