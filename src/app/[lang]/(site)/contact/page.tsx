import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Flag, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { ContactForm } from "@/components/site/contact-form";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/domain/types";
import { publicContactEmail } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return i18nPageMeta(lang, "contact", undefined, m.contact.metaTitle, m.contact.metaDescription);
}

export default async function ContactPage({ searchParams }: PageProps<"/[lang]/contact">) {
  const { lang, m } = await getI18n();
  const c = m.contact;
  const email = publicContactEmail();
  const [reportBefore, reportAfter] = c.reportText.split("{button}");
  return (
    <div className="container-page pb-12 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: c.title, href: localizedPath(lang, "contact") }]} />
      <header className="mb-10 mt-8 border-b border-hairline pb-8 sm:mb-12 sm:pb-10">
        <p className="eyebrow mb-4 text-brand">{c.eyebrow}</p>
        <h1 className="font-display text-display-lg">{c.title}</h1>
        <p className="mt-5 max-w-[56ch] text-lede text-muted-foreground">
          {c.lead}
        </p>
      </header>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="form-baslik" className="lg:col-span-7">
          <h2 id="form-baslik" className="sr-only">{c.formHeading}</h2>
          <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-lg bg-muted" />}>
            <FormWithCategory searchParams={searchParams} />
          </Suspense>
        </section>
        <aside className="grid content-start gap-4 lg:col-span-4 lg:col-start-9" aria-label={c.otherChannels}>
          <InfoCard icon={Flag} title={c.reportTitle} href={localizedPath(lang, "safety")} cta={c.reportCta}>
            {reportBefore}<strong className="font-medium text-foreground">{c.reportButton}</strong>{reportAfter}
          </InfoCard>
          <InfoCard icon={ShieldCheck} title={c.removalTitle} href={localizedPath(lang, "removal")} cta={c.removalCta}>
            {c.removalText}
          </InfoCard>
          {email ? (
            <div className="rounded-lg border border-hairline p-5">
              <p className="eyebrow text-muted-foreground">{c.email}</p>
              <p className="mt-2 break-all font-medium">{email}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

async function FormWithCategory({ searchParams }: Pick<PageProps<"/[lang]/contact">, "searchParams">) {
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
