import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundContent({ description = "Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir." }: { description?: string }) {
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-full bg-muted"><Compass className="size-6 text-muted-foreground" aria-hidden /></div>
      <h1 className="text-3xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      <div className="mt-6 flex gap-2">
        <Button asChild><Link href="/kesfet">Profilleri keşfet</Link></Button>
        <Button asChild variant="outline"><Link href="/">Ana sayfa</Link></Button>
      </div>
    </div>
  );
}
