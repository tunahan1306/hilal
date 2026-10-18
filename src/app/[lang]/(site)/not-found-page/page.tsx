import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.notFound.metaTitle, robots: { index: false, follow: false } };
}

/** Proxy, geçersiz konum/profil adreslerini 404 durum koduyla bu içerikle yanıtlar. */
export default function NotFoundPage() {
  return <NotFoundContent variant="location" />;
}
