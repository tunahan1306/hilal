import { Suspense } from "react";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getI18n } from "@/i18n/server";

export default async function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  const { m } = await getI18n();
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="flex-1">
        <Suspense fallback={<div className="container-page py-12" role="status">{m.common.loadingProfiles}</div>}>
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
