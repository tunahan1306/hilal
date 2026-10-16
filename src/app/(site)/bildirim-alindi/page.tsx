import type { Metadata } from "next";
import Link from "next/link";
import { CrescentMark } from "@/components/site/logo";

export const metadata: Metadata = { title: "Bildiriminiz alındı", robots: { index: false, follow: false } };

export default function ReportReceivedPage() {
  return (
    <div className="container-page py-24" role="status">
      <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> Moderasyon</p>
      <h1 className="font-display mt-5 text-display-lg">Bildiriminiz alındı</h1>
      <p className="mt-4 max-w-md text-lede text-muted-foreground">
        Bildirdiğiniz profil, moderasyon incelemesi tamamlanana kadar yayından kaldırıldı. Teşekkür ederiz.
      </p>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">Acil bir tehlike söz konusuysa lütfen 112&apos;yi arayın.</p>
      <Link href="/kesfet" className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Keşfetmeye devam et</Link>
    </div>
  );
}
