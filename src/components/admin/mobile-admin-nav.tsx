"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminNav } from "./admin-nav";

export function MobileAdminNav({ badges = {}, demo = false }: { badges?: Record<string, number>; demo?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Yönetim menüsü"><Menu className="size-5" aria-hidden /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader><SheetTitle>Yönetim</SheetTitle></SheetHeader>
        <nav aria-label="Yönetim menüsü" className="px-3"><AdminNav onNavigate={() => setOpen(false)} badges={badges} /></nav>
        <div className="mt-auto space-y-2 border-t border-hairline px-5 py-4 text-xs text-muted-foreground">
          {demo ? <p className="rounded-sm bg-warning/12 px-2 py-1 text-warning">Demo modu · sentetik veri</p> : null}
          <Link href="/" prefetch={false} className="inline-flex min-h-9 items-center gap-1 hover:text-foreground">Siteyi görüntüle <ArrowUpRight className="size-3" aria-hidden /></Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
