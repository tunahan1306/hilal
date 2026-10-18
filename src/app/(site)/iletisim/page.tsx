import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Flag, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ContactForm } from "@/components/site/contact-form";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/domain/types";
import { publicContactEmail, ogFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Sorularınız, önerileriniz ve platformla ilgili talepleriniz için Hilal ekibiyle iletişime geçin.",
  alternates: { canonical: "/iletisim" },
  openGraph: ogFor("/iletisim", "İletişim", "Sorularınız, önerileriniz ve platformla ilgili talepleriniz için Hilal ekibiyle iletişime geçin."),
};

export default function ContactPage({ searchParams }: PageProps<"/iletisim">) {
  const email = publicContactEmail();
  return (
    <div className="container-page pb-12 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: "İletişim", href: "/iletisim" }]} />
      <header className="mb-10 mt-8 border-b border-hairline pb-8 sm:mb-12 sm:pb-10">
        <p className="eyebrow mb-4 text-brand">Bize ulaşın</p>
        <h1 className="font-display text-display-lg">İletişim</h1>
        <p className="mt-5 max-w-[56ch] text-lede text-muted-foreground">
          Sorularınız, önerileriniz ve platformla ilgili talepleriniz için bizimle iletişime geçebilirsiniz.
        </p>
      </header>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="form-baslik" className="lg:col-span-7">
          <h2 id="form-baslik" className="sr-only">İletişim formu</h2>
          <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-lg bg-muted" />}>
            <FormWithCategory searchParams={searchParams} />
          </Suspense>
        </section>
        <aside className="grid content-start gap-4 lg:col-span-4 lg:col-start-9" aria-label="Diğer kanallar">
          <InfoCard icon={Flag} title="Bir profili mi bildirmek istiyorsunuz?" href="/guvenlik" cta="Bildirim kuralları">
            En hızlı yol, profil sayfasındaki <strong className="font-medium text-foreground">Bildir</strong> düğmesidir; bildirim doğrudan moderasyon kuyruğuna düşer.
          </InfoCard>
          <InfoCard icon={ShieldCheck} title="Profil kaldırma ve KVKK" href="/kaldirma-talebi" cta="Başvuru formu">
            Verilerinize erişim, düzeltme, silme veya profil kaldırma talepleri için KVKK başvuru formunu kullanın.
          </InfoCard>
          {email ? (
            <div className="rounded-lg border border-hairline p-5">
              <p className="eyebrow text-muted-foreground">E-posta</p>
              <p className="mt-2 break-all font-medium">{email}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

async function FormWithCategory({ searchParams }: Pick<PageProps<"/iletisim">, "searchParams">) {
  const konu = (await searchParams).konu;
  const category = CONTACT_CATEGORIES.includes(konu as ContactCategory) ? (konu as ContactCategory) : undefined;
  return <ContactForm defaultCategory={category} />;
}

function InfoCard({ icon: Icon, title, href, cta, children }: { icon: typeof Flag; title: string; href: string; cta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline p-5">
      <h3 className="flex items-center gap-2 font-medium"><Icon className="size-4 text-brand" aria-hidden /> {title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
      <Link href={href} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-brand underline-offset-4 hover:underline">{cta} <ArrowUpRight className="size-4" aria-hidden /></Link>
    </div>
  );
}
