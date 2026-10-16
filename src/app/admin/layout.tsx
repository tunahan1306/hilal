import type { Metadata } from "next";

// Başlık şablonu tanımlandığı segmentin alt segmentlerine uygulanır; bu yüzden üst düzeyde.
export const metadata: Metadata = {
  title: { template: "%s · Yönetim | Hilal", default: "Yönetim | Hilal" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
