import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { RootDocument, VIEWPORT } from "@/components/root-document";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, OG_LOCALE, isLocale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { SITE, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${SITE.name} — ${m.meta.tagline}`, template: `%s | ${SITE.name}` },
    description: m.meta.description,
    applicationName: SITE.name,
    openGraph: { type: "website", locale: OG_LOCALE[lang], alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => OG_LOCALE[l]), siteName: SITE.name },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = VIEWPORT;

export default async function LocaleRootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <RootDocument lang={lang}>
      <I18nProvider lang={lang}>{children}</I18nProvider>
    </RootDocument>
  );
}
