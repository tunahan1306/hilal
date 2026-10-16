import { Suspense } from "react";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="flex-1">
        <Suspense fallback={<div className="container-page py-12" role="status">Profiller yükleniyor…</div>}>
          {children}
        </Suspense>
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </>
  );
}
