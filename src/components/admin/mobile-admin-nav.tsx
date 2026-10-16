"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminNav } from "./admin-nav";

export function MobileAdminNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Yönetim menüsü"><Menu className="size-5" aria-hidden /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader><SheetTitle>Yönetim</SheetTitle></SheetHeader>
        <nav aria-label="Yönetim menüsü" className="px-3"><AdminNav onNavigate={() => setOpen(false)} /></nav>
      </SheetContent>
    </Sheet>
  );
}
