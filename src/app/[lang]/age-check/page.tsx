import { Suspense } from "react";
import type { Metadata } from "next";
import { AgeConfirmation } from "@/components/site/age-confirmation";
import { safeReturnPath } from "@/domain/age-confirmation";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.age.metaTitle, robots: { index: false, follow: true } };
}

export default function AgePage({ searchParams }: PageProps<"/[lang]/age-check">) {
  return <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}><Content searchParams={searchParams} /></Suspense>;
}

async function Content({ searchParams }: Pick<PageProps<"/[lang]/age-check">, "searchParams">) {
  const [{ lang }, params] = await Promise.all([getI18n(), searchParams]);
  return <AgeConfirmation returnTo={safeReturnPath(params.returnTo, lang)} declined={params.declined === "1"} />;
}
