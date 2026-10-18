import type { Metadata } from "next";
import Link from "next/link";
import { CrescentMark } from "@/components/site/logo";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };

/** Yönetim panelinde eşleşmeyen adresler ve bulunamayan kayıtlar (Türkçe). */
export default function AdminNotFound() {
  return (
    <main id="icerik" className="container-page flex flex-1 flex-col justify-center py-24">
      <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> 404</p>
      <h1 className="font-display mt-5 text-display-lg">Sayfa bulunamadı</h1>
      <p className="mt-4 max-w-md text-muted-foreground">Aradığınız kayıt veya sayfa bulunamadı; silinmiş ya da hiç var olmamış olabilir.</p>
      <Link href="/admin" prefetch={false} className="mt-8 inline-flex h-11 w-fit items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Gösterge paneline dön</Link>
    </main>
  );
}
