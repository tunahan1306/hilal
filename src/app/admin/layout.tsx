import type { Metadata, Viewport } from "next";
import { RootDocument, VIEWPORT } from "@/components/root-document";
import { I18nProvider } from "@/i18n/client";
import { siteUrl } from "@/lib/site";

// Yönetim paneli ayrı kök layout'tur (Türkçe; ziyaretçi dil yönlendirmesinin dışında).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { template: "%s · Yönetim | Hilal", default: "Yönetim | Hilal" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = VIEWPORT;

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <RootDocument lang="tr"><I18nProvider lang="tr">{children}</I18nProvider></RootDocument>;
}
