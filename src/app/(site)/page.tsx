import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AgeBadge } from "@/components/site/age-badge";
import { CityPicker } from "@/components/site/city-picker";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileCard } from "@/components/site/profile-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getProvince, listProvinces, POPULAR_PROVINCE_SLUGS } from "@/domain/locations";
import { formatNumber, SITE, siteUrl } from "@/lib/site";
import { getFeaturedProfiles, getInterests, getLocationCounts, profileCountFor } from "@/server/queries/public";

const FAQ = [
  {
    q: "Profiller kim tarafından oluşturuluyor?",
    a: "Profiller yalnızca platform yönetimi tarafından, profil sahibinin açık ve yazılı yayın yetkilendirmesi alındıktan sonra oluşturulur. Ziyaretçiler profil oluşturamaz.",
  },
  {
    q: "Yaş doğrulaması nasıl yapılıyor?",
    a: "Her profil sahibinin 18 yaşından büyük olduğu, yayın öncesinde kimlik belgesi üzerinden doğrulanır. Sitedeki 18+ işareti bilgilendiricidir; yaşın kanıtı değildir. Belgeler gizli tutulur ve saklama süresi sonunda silinir.",
  },
  {
    q: "Profil sahipleriyle nasıl iletişim kurabilirim?",
    a: "Kişisel iletişim bilgileri (telefon, e-posta, sosyal medya) paylaşılmaz ve profillerde yer alamaz. İletişim özellikleri hukuki ve güvenlik değerlendirmesi tamamlanmadan etkinleştirilmez.",
  },
  {
    q: "Bir profilin kaldırılmasını nasıl talep ederim?",
    a: "Profil sayfasındaki “Profil kaldırma başvurusu” bağlantısını veya kaldırma başvuru formunu kullanabilirsiniz. Talepler en geç 30 gün içinde sonuçlandırılır.",
  },
  {
    q: "Sponsorlu profil ne demek?",
    a: "Sponsorlu profiller, profil sahibinin görünürlük paketi kapsamında listelerde öne çıkarılan profillerdir ve her zaman “Sponsorlu” etiketiyle açıkça işaretlenir.",
  },
  {
    q: "Ücretli hizmet ilanı verilebilir mi?",
    a: "Hayır. Platform yalnızca sosyal tanışma ve ortak ilgi alanları içindir. Ücretli cinsel hizmet tanıtımı, aracılık veya yönlendirme kesinlikle yasaktır; bu tür içerikler otomatik tarama ve insan moderasyonuyla engellenir.",
  },
];

export default async function HomePage() {
  const [featured, interests, counts] = await Promise.all([getFeaturedProfiles(9), getInterests(), getLocationCounts()]);
  const cities = listProvinces().map((p) => ({ slug: p.slug, name: p.name, plate: p.plate, count: profileCountFor(counts, p.plate) }));
  const popular = POPULAR_PROVINCE_SLUGS.map((s) => getProvince(s)!).map((p) => ({ ...p, count: profileCountFor(counts, p.plate) }));
  const totalProfiles = counts.filter((c) => c.districtSlug === null).reduce((s, c) => s + c.count, 0);
  const [lead, ...rest] = featured;
  const collage = featured.slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: siteUrl(), inLanguage: "tr-TR" },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      {/* ——— Hero ——— */}
      <section className="container-page grid-page items-end gap-y-12 pb-16 pt-12 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="col-span-4 sm:col-span-8 lg:col-span-6 lg:pb-6">
          <p className="eyebrow text-muted-foreground">
            Sosyal keşif · 81 il · {formatNumber(totalProfiles)} doğrulanmış profil
          </p>
          <h1 className="font-display mt-6 text-display-xl">
            İnsanları <em className="italic text-brand">şehirleriyle</em> tanıyın.
          </h1>
          <p className="mt-6 max-w-[42ch] text-lede text-muted-foreground">
            Kitap kulübünden sabah koşusuna; ortak ilgi alanlarına sahip yetişkinlerin rızası alınmış profillerini il ve ilçe bazında keşfedin.
          </p>
          <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <CityPicker cities={cities} className="sm:flex-1" />
            <Link href="/kesfet" className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[0.9375rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Profilleri keşfet <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-10 grid max-w-xl grid-cols-1 gap-y-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-x-6" aria-label="Güven ilkeleri">
            {["Belgeyle yaş doğrulaması", "Açık yayın rızası", "İletişim bilgisi paylaşılmaz"].map((t) => (
              <li key={t} className="flex items-center gap-2 border-t border-hairline pt-3">
                <span className="size-1.5 shrink-0 rounded-full bg-brass" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>

        {collage.length === 3 ? (
          <div className="col-span-4 hidden grid-cols-[1.15fr_1fr] gap-x-6 sm:col-span-8 sm:grid lg:col-span-6 lg:gap-x-8" aria-hidden>
            <CollageImage profile={collage[0]} priority sizes="(min-width: 1024px) 26vw, 46vw" />
            <div className="flex flex-col gap-y-8 pt-[22%]">
              <CollageImage profile={collage[1]} sizes="(min-width: 1024px) 22vw, 40vw" />
              <CollageImage profile={collage[2]} className="w-[72%] self-end" sizes="(min-width: 1024px) 16vw, 30vw" />
            </div>
          </div>
        ) : null}
      </section>

      {/* ——— Öne çıkanlar ——— */}
      <section className="container-page hairline-t pt-10 lg:pt-14" aria-labelledby="one-cikanlar">
        <SectionHead
          id="one-cikanlar"
          eyebrow="Bu hafta"
          title="Öne çıkan profiller"
          note="Sponsorlu profiller her zaman etiketlenir."
          action={<Link href="/kesfet" className="inline-flex min-h-6 items-center gap-1 text-sm underline-offset-4 hover:underline">Tümünü gör <ArrowUpRight className="size-3.5" aria-hidden /></Link>}
        />
        {lead ? (
          <div className="grid-page gap-y-12">
            <div className="col-span-4 sm:col-span-8 lg:col-span-6">
              <ProfileCard profile={lead} variant="feature" priority sizes="(min-width: 1024px) 40vw, 92vw" />
            </div>
            <ul className="col-span-4 grid grid-cols-2 gap-x-4 gap-y-10 sm:col-span-8 sm:grid-cols-4 sm:gap-x-6 lg:col-span-6 lg:col-start-7 lg:grid-cols-2 lg:gap-x-8" role="list">
              {rest.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <ProfileCard profile={p} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 22vw, 46vw" />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState title="Henüz yayında profil yok" description="Profiller yalnızca rıza, yaş doğrulaması ve moderasyon tamamlandıktan sonra yayınlanır." />
        )}
      </section>

      {/* ——— Şehir indeksi ——— */}
      <section className="container-page grid-page mt-28 gap-y-10" aria-labelledby="sehirler">
        <div className="col-span-4 sm:col-span-8 lg:col-span-4">
          <p className="eyebrow text-muted-foreground">İndeks</p>
          <h2 id="sehirler" className="font-display mt-3 text-display-lg">Şehir şehir</h2>
          <p className="mt-4 max-w-[36ch] text-muted-foreground">
            Her il ve ilçe sayfası, o bölgede yayında olan gerçek profillerden oluşur. Profili olmayan bölgeler arama motorlarına gösterilmez.
          </p>
          <Link href="/sehirler" className="mt-6 inline-flex min-h-6 items-center gap-1 text-sm underline-offset-4 hover:underline">
            81 ilin tamamı <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ol className="col-span-4 sm:col-span-8 lg:col-span-7 lg:col-start-6">
          {popular.map((c) => (
            <li key={c.slug} className="border-t border-hairline last:border-b">
              <Link href={`/sehir/${c.slug}`} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 sm:py-5">
                <span className="text-xs tabular-nums text-muted-foreground">{String(c.plate).padStart(2, "0")}</span>
                <span className="font-display text-display-sm transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1.5">
                  {c.name}
                  <span className="ml-3 align-middle font-sans text-xs text-muted-foreground max-sm:hidden">{c.region}</span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{c.count > 0 ? `${c.count} profil` : "Yakında"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ——— İlgi alanları ——— */}
      <section className="container-page mt-28" aria-labelledby="ilgi">
        <p className="eyebrow text-muted-foreground">Ortak noktalar</p>
        <h2 id="ilgi" className="sr-only">İlgi alanına göre keşfet</h2>
        <ul className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-display-md">
          {interests.map((i, idx) => (
            <li key={i.id} className="flex items-baseline gap-2">
              <Link href={`/kesfet?ilgi=${i.slug}`} className="underline-offset-[6px] decoration-1 transition-colors hover:text-brand hover:underline">
                {i.name}
              </Link>
              {idx < interests.length - 1 ? <span className="text-hairline" aria-hidden>/</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {/* ——— Nasıl çalışır ——— */}
      <section className="container-page mt-28" aria-labelledby="nasil">
        <SectionHead id="nasil" eyebrow="Yöntem" title="Nasıl çalışır?" />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            { t: "Rıza ve doğrulama", d: "Profil sahibi yayın yetkilendirmesini ve fotoğraf kullanım iznini verir; yaşı ve kimliği yönetim tarafından belgeyle doğrulanır." },
            { t: "Moderasyon", d: "Her profil yayından önce içerik kurallarına göre incelenir. İletişim bilgisi veya ücretli hizmet çağrışımı içeren içerik yayınlanamaz." },
            { t: "Keşif", d: "Şehir, ilçe, yaş aralığı ve ilgi alanlarına göre keşfedin; uygunsuz bir içeriği tek tıkla bildirin." },
          ].map((s, i) => (
            <li key={s.t} className="border-t border-foreground/80 pt-5">
              <span className="font-display text-display-md tabular-nums text-brass">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-lg font-medium">{s.t}</h3>
              <p className="mt-2 max-w-[38ch] text-[0.9375rem] leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ——— Topluluk bandı ——— */}
      <section className="mt-28 bg-primary text-primary-foreground" aria-labelledby="topluluk">
        <div className="container-page grid-page gap-y-10 py-20 lg:py-28">
          <div className="col-span-4 sm:col-span-8 lg:col-span-5">
            <p className="eyebrow flex items-center gap-3 text-primary-foreground/70"><AgeBadge className="text-primary-foreground" /> Yalnızca yetişkinler</p>
            <h2 id="topluluk" className="font-display mt-5 text-display-lg">Güven, ürünün kendisidir.</h2>
            <p className="mt-5 max-w-[40ch] text-primary-foreground/75">
              Kurallar yalnızca metinde değil; yayın ön koşullarında, içerik taramasında ve şikâyet sisteminde uygulanır.
            </p>
            <Link href="/guvenlik" className="mt-8 inline-flex h-11 items-center gap-2 rounded-md border border-primary-foreground/30 px-5 text-sm transition-colors hover:bg-primary-foreground/10">
              Topluluk kuralları <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="col-span-4 grid gap-x-8 sm:col-span-8 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {[
              ["Yalnızca 18+", "Yaş, yayından önce belgeyle doğrulanır."],
              ["Ücretli hizmet yasak", "Tanıtım, aracılık ve yönlendirme engellenir."],
              ["İletişim bilgisi yok", "Telefon, e-posta ve bağlantılar yayınlanamaz."],
              ["İzinsiz görsel yok", "Her görselin kullanım hakkı ayrıca doğrulanır."],
              ["Taciz yasak", "Nefret söylemi ve tehdit kaldırılır."],
              ["Kaldırma hakkı", "Profil sahibi rızasını her an geri alabilir."],
            ].map(([t, d]) => (
              <li key={t} className="border-t border-primary-foreground/15 py-4">
                <p className="font-medium">{t}</p>
                <p className="mt-1 text-sm text-primary-foreground/70">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ——— SSS ——— */}
      <section className="container-page grid-page mt-28 gap-y-8" aria-labelledby="sss">
        <div className="col-span-4 sm:col-span-8 lg:col-span-4">
          <p className="eyebrow text-muted-foreground">Sorular</p>
          <h2 id="sss" className="font-display mt-3 text-display-lg">Sıkça sorulanlar</h2>
        </div>
        <Accordion type="single" collapsible className="col-span-4 border-t border-hairline sm:col-span-8 lg:col-span-7 lg:col-start-6">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`} className="border-b border-hairline">
              <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="measure pb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}

function CollageImage({ profile, className, sizes, priority = false }: { profile: { nickname: string; province: { name: string }; images: { url: string }[] }; className?: string; sizes: string; priority?: boolean }) {
  return (
    <figure className={className}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xs bg-muted">
        <Image src={profile.images[0].url} alt="" fill sizes={sizes} priority={priority} className="object-cover object-[50%_30%]" />
      </div>
      <figcaption className="eyebrow mt-2.5 text-muted-foreground">{profile.nickname} · {profile.province.name}</figcaption>
    </figure>
  );
}

function SectionHead({ id, eyebrow, title, note, action }: { id: string; eyebrow: string; title: string; note?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        <h2 id={id} className="font-display mt-3 text-display-lg">{title}</h2>
        {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
    </div>
  );
}
