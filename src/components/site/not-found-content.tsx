import Link from "next/link";
import { CrescentMark } from "./logo";

export function NotFoundContent({ description = "Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir." }: { description?: string }) {
  return (
    <div className="container-page flex flex-1 flex-col justify-center py-24">
      <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> 404</p>
      <h1 className="font-display mt-5 text-display-xl">Sayfa bulunamadı</h1>
      <p className="mt-4 max-w-md text-lede text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/kesfet" className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Profilleri keşfet</Link>
        <Link href="/sehirler" className="inline-flex h-11 items-center rounded-md border border-hairline px-5 text-sm">Şehirler</Link>
      </div>
    </div>
  );
}
