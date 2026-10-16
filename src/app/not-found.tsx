import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

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
