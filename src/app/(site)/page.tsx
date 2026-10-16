import Link from "next/link";
import { ArrowRight, BadgeCheck, FileCheck2, Flag, ShieldCheck, UserCheck } from "lucide-react";
import { CityPicker } from "@/components/site/city-picker";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileGrid } from "@/components/site/profile-grid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getProvince, listProvinces, POPULAR_PROVINCE_SLUGS } from "@/domain/locations";
import { SITE, siteUrl } from "@/lib/site";
import { getFeaturedProfiles, getInterests, getLocationCounts, profileCountFor } from "@/server/queries/public";

const FAQ = [
  {
    q: "Profiller kim tarafından oluşturuluyor?",
    a: "Profiller yalnızca platform yönetimi tarafından, profil sahibinin açık ve yazılı yayın yetkilendirmesi alındıktan sonra oluşturulur. Ziyaretçiler profil oluşturamaz.",
  },
  {
    q: "Yaş doğrulaması nasıl yapılıyor?",
    a: "Her profil sahibinin 18 yaşından büyük olduğu, yayın öncesinde kimlik belgesi üzerinden doğrulanır. Doğrulama tamamlanmadan profil yayınlanamaz; belgeler gizli tutulur ve saklama süresi sonunda silinir.",
  },
  {
    q: "Profil sahipleriyle nasıl iletişim kurabilirim?",
    a: "Kişisel iletişim bilgileri (telefon, e-posta, sosyal medya) varsayılan olarak paylaşılmaz. Profillerde iletişim bilgisi yer alması içerik kurallarımıza aykırıdır.",
  },
  {
    q: "Bir profilin kaldırılmasını nasıl talep ederim?",
    a: "Profil sayfasındaki “Profil kaldırma başvurusu” bağlantısını veya kaldırma başvuru formunu kullanabilirsiniz. Profil sahibinin talebi en kısa sürede, en geç 30 gün içinde sonuçlandırılır.",
  },
  {
    q: "Sponsorlu profil ne demek?",
    a: "Sponsorlu profiller, profil sahibinin görünürlük paketi kapsamında listelerde öne çıkarılan profillerdir ve her zaman “Sponsorlu” etiketiyle açıkça işaretlenir.",
  },
  {
    q: "Ücretli hizmet ilanı verilebilir mi?",
    a: "Hayır. Platform yalnızca sosyal tanışma ve ortak ilgi alanları içindir. Ücretli cinsel hizmet tanıtımı, aracılık veya yönlendirme kesinlikle yasaktır; bu tür içerikler otomatik ve insan moderasyonuyla engellenir.",
  },
];

export default async function HomePage() {
  const [featured, interests, counts] = await Promise.all([getFeaturedProfiles(8), getInterests(), getLocationCounts()]);
  const cities = listProvinces().map((p) => ({ slug: p.slug, name: p.name, plate: p.plate, count: profileCountFor(counts, p.plate) }));
  const popular = POPULAR_PROVINCE_SLUGS.map((s) => getProvince(s)!).map((p) => ({ ...p, count: profileCountFor(counts, p.plate) }));

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: siteUrl(),
            inLanguage: "tr-TR",
            potentialAction: { "@type": "SearchAction", target: `${siteUrl()}/kesfet?il={il}`, "query-input": "required name=il" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--brand-soft),transparent_70%)]" aria-hidden />
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-brand" aria-hidden /> Yalnızca doğrulanmış, 18+ ve rızası alınmış profiller
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Ortak ilgi alanlarıyla <span className="text-brand">yeni insanlar</span> keşfedin.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Türkiye&apos;nin 81 ilinde kitap kulübünden doğa yürüyüşüne, sosyal çevrenizi genişletebileceğiniz kişileri şehir ve ilçe bazında bulun.
            </p>
            <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <CityPicker cities={cities} className="sm:flex-1" />
              <Button asChild size="lg">
                <Link href="/kesfet">Tümünü keşfet <ArrowRight className="size-4" aria-hidden /></Link>
              </Button>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm min-[480px]:grid-cols-2 min-[480px]:gap-3" aria-label="Güven ilkeleri">
            {[
              { icon: UserCheck, t: "18+ yaş doğrulaması", d: "Her profil yayın öncesinde doğrulanır." },
              { icon: FileCheck2, t: "Açık yayın rızası", d: "Profil sahibinin yazılı yetkilendirmesi olmadan yayın yok." },
              { icon: BadgeCheck, t: "Kimlik doğrulama rozeti", d: "Rozet yalnızca gerçekten doğrulanmış profillerde." },
              { icon: Flag, t: "Hızlı şikâyet", d: "Kritik bildirimlerde profil anında yayından kalkar." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-[var(--shadow-card)] min-[480px]:block min-[480px]:p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand min-[480px]:mb-3 min-[480px]:mt-0" aria-hidden />
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="mt-0.5 text-muted-foreground min-[480px]:mt-1">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* İlgi alanları */}
      <section className="container-page py-14" aria-labelledby="ilgi-baslik">
        <SectionHeading id="ilgi-baslik" title="İlgi alanına göre keşfet" description="Ortak noktalarınızdan başlayın." />
        <ul className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <li key={i.id}>
              <Link href={`/kesfet?ilgi=${i.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-ring hover:bg-accent">
                {i.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Öne çıkanlar */}
      <section className="container-page py-6" aria-labelledby="one-cikan-baslik">
        <SectionHeading
          id="one-cikan-baslik"
          title="Öne çıkan sosyal profiller"
          description="Sponsorlu profiller açıkça etiketlenir."
          action={<Link href="/kesfet" className="inline-flex min-h-6 items-center text-sm font-medium text-brand underline-offset-4 hover:underline">Tümünü gör</Link>}
        />
        {featured.length ? (
          <ProfileGrid profiles={featured} priorityCount={2} />
        ) : (
          <EmptyState title="Henüz yayında profil yok" description="Profiller yalnızca rıza, yaş doğrulaması ve moderasyon tamamlandıktan sonra yayınlanır." />
        )}
      </section>

      {/* Popüler şehirler */}
      <section className="container-page py-14" aria-labelledby="sehir-baslik">
        <SectionHeading
          id="sehir-baslik"
          title="Popüler şehirler"
          action={<Link href="/sehirler" className="inline-flex min-h-6 items-center text-sm font-medium text-brand underline-offset-4 hover:underline">81 ilin tamamı</Link>}
        />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {popular.map((c) => (
            <li key={c.slug}>
              <Link href={`/sehir/${c.slug}`} className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-[var(--shadow-raised)]">
                <span className="text-xs tabular-nums text-muted-foreground">{String(c.plate).padStart(2, "0")} · {c.region}</span>
                <span className="mt-6 flex items-end justify-between gap-2">
                  <span className="text-lg font-semibold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.count > 0 ? `${c.count} profil` : "Yakında"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Nasıl çalışır */}
      <section className="border-y border-border/60 bg-muted/40" aria-labelledby="nasil-baslik">
        <div className="container-page py-16">
          <SectionHeading id="nasil-baslik" title="Platform nasıl çalışır?" />
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              { t: "Rıza ve doğrulama", d: "Profil sahibi yayın yetkilendirmesini ve fotoğraf kullanım iznini verir; yaşı ve kimliği yönetim tarafından doğrulanır." },
              { t: "Moderasyon", d: "Her profil yayın öncesinde içerik kurallarına göre incelenir. İletişim bilgisi ve ücretli hizmet çağrışımı içeren içerik yayınlanamaz." },
              { t: "Keşif", d: "Ziyaretçiler şehir, ilçe, yaş aralığı ve ilgi alanlarına göre profilleri keşfeder; uygunsuz içeriği tek tıkla bildirir." },
            ].map((s, i) => (
              <li key={s.t} className="relative rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
                <span className="mb-4 grid size-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand" aria-hidden>{i + 1}</span>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Güvenlik */}
      <section className="container-page py-16" aria-labelledby="guvenlik-baslik">
        <div className="grid gap-8 rounded-3xl border border-border/70 bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <h2 id="guvenlik-baslik" className="text-2xl font-semibold sm:text-3xl">Güvenlik ve topluluk kuralları</h2>
            <p className="mt-3 text-muted-foreground">Herkes için saygılı ve güvenli bir ortam, ürünün temel tasarım ilkesidir.</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/guvenlik">Kuralların tamamı</Link>
            </Button>
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              "Yalnızca 18 yaş üstü kişiler",
              "Ücretli hizmet tanıtımı ve aracılık yasak",
              "Kişisel iletişim bilgisi paylaşılmaz",
              "İzinsiz fotoğraf ve kimlik taklidi yasak",
              "Taciz ve nefret söylemi yasak",
              "Her profil için kaldırma hakkı",
            ].map((r) => (
              <li key={r} className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SSS */}
      <section className="container-page max-w-3xl pb-8" aria-labelledby="sss-baslik">
        <SectionHeading id="sss-baslik" title="Sıkça sorulan sorular" />
        <Accordion type="single" collapsible className="rounded-2xl border border-border/70 bg-card px-5">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left text-[0.95rem]">{f.q}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}

function SectionHeading({ id, title, description, action }: { id: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
    </div>
  );
}
