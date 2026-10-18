import type { Metadata } from "next";
import { Suspense } from "react";
import { PrivacyRequestForm } from "@/components/site/privacy-request-form";
import { ProsePage } from "@/components/site/prose-page";
import { siteUrl } from "@/lib/site";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return i18nPageMeta(lang, "removal", undefined, m.removal.metaTitle, m.removal.metaDescription);
}

export default async function RemovalRequestPage({ searchParams }: PageProps<"/[lang]/removal-request">) {
  const { lang, m } = await getI18n();
  return (
    <ProsePage eyebrow={m.removal.eyebrow} title={m.removal.title} path={localizedPath(lang, "removal")} lead={m.removal.lead}>
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-2xl bg-muted" />}>
        <FormWithDefaults searchParams={searchParams} />
      </Suspense>
    </ProsePage>
  );
}

async function FormWithDefaults({ searchParams }: Pick<PageProps<"/[lang]/removal-request">, "searchParams">) {
  const { lang } = await getI18n();
  const profil = (await searchParams).profil;
  const slug = typeof profil === "string" && /^[a-z0-9-]{1,100}$/.test(profil) ? profil : undefined;
  return <PrivacyRequestForm defaultProfileUrl={slug ? `${siteUrl()}${localizedPath(lang, "profile", { slug })}` : undefined} />;
}
