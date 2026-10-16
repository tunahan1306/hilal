import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };

/** Hiçbir rotayla eşleşmeyen adresler (site layout'u dışında). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="flex flex-1 flex-col">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
