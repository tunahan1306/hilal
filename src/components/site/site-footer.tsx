import Link from "next/link";
import { cacheLife } from "next/cache";
import { Logo } from "./logo";

const GROUPS = [
  {
    title: "Keşfet",
    links: [
      { href: "/kesfet", label: "Tüm profiller" },
      { href: "/sehirler", label: "Şehirler" },
      { href: "/sehir/istanbul", label: "İstanbul" },
      { href: "/sehir/ankara", label: "Ankara" },
      { href: "/sehir/izmir", label: "İzmir" },
    ],
  },
  {
    title: "Güven",
    links: [
      { href: "/guvenlik", label: "Güvenlik ve topluluk kuralları" },
      { href: "/kaldirma-talebi", label: "Profil kaldırma başvurusu" },
      { href: "/paketler", label: "Üyelik paketleri" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { href: "/kvkk", label: "KVKK aydınlatma metni" },
      { href: "/kullanim-kosullari", label: "Kullanım koşulları" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-muted/40 pb-20 md:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Yalnızca 18 yaş üstü, açık rızası alınmış ve doğrulanmış sosyal profiller. Ücretli hizmet tanıtımına izin verilmez.
          </p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="mb-3 text-sm font-medium">{g.title}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="rounded-sm transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70">
        <p className="container-page py-5 text-xs text-muted-foreground">
          © <CopyrightYear /> Hilal. Profiller yalnızca yönetim tarafından, profil sahibinin açık yetkilendirmesiyle oluşturulur.
        </p>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
