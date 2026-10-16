import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Bildiriminiz alındı", robots: { index: false, follow: false } };

export default function ReportReceivedPage() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center" role="status">
      <CheckCircle2 className="mb-4 size-12 text-success" aria-hidden />
      <h1 className="text-2xl font-semibold">Bildiriminiz alındı</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Bildirdiğiniz profil, moderasyon incelemesi tamamlanana kadar yayından kaldırıldı. Teşekkür ederiz.
      </p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">Acil bir tehlike söz konusuysa lütfen 112&apos;yi arayın.</p>
      <Button asChild className="mt-6"><Link href="/kesfet">Keşfetmeye devam et</Link></Button>
    </div>
  );
}
