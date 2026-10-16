import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };

/** Proxy, geçersiz il/ilçe adreslerini 404 durum koduyla bu içerikle yanıtlar. */
export default function NotFoundPage() {
  return <NotFoundContent description="Aradığınız il veya ilçe bulunamadı. Tüm illerin listesine Şehirler sayfasından göz atabilirsiniz." />;
}
