import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { RootDocument, VIEWPORT } from "@/components/root-document";
import { I18nProvider } from "@/i18n/client";
import { siteUrl } from "@/lib/site";

// Son kullanıcı hesap alanı ayrı kök layout'tur (Module A — admin panelinden ayrı).
// Henüz yerelleştirilmiş (locale) rota mimarisine taşınmadı — bkz. 02b_UX_DESIGN.md
// ve docs/transformation/02_ARCHITECTURE.md §6 (tasarım kaydı ayrımı); bu, çalışan
// ve test edilebilir akışı önceliklendiren bilinçli bir ilk-sürüm kapsam kararıdır.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { template: "%s · Hesap | Hilal", default: "Hesap | Hilal" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = VIEWPORT;

// Hesap sayfaları oturuma (cookies/searchParams) bağlıdır; her sayfanın kendi Suspense
// sınırı eklemesine gerek kalmasın diye burada, admin layout'un children'ı sardığı desenle
// aynı şekilde tek bir sınır kuruluyor.
export default function UserRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootDocument lang="tr">
      <I18nProvider lang="tr">
        <Suspense fallback={<div className="min-h-dvh" />}>{children}</Suspense>
      </I18nProvider>
    </RootDocument>
  );
}
