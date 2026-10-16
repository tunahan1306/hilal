import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export const MAIN_NAV = [
  { href: "/kesfet", label: "Keşfet" },
  { href: "/sehirler", label: "Şehirler" },
  { href: "/guvenlik", label: "Güvenlik" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow">
        İçeriğe geç
      </a>
      <div className="container-page flex h-14 items-center gap-6">
        <Logo />
        <nav aria-label="Ana menü" className="hidden md:block">
          <NavLinks items={MAIN_NAV} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Profil ara">
            <Link href="/kesfet"><Search className="size-[1.1rem]" aria-hidden /></Link>
          </Button>
          <ThemeToggle />
          <Button asChild size="sm" className="ml-1 hidden md:inline-flex">
            <Link href="/kesfet">Profilleri keşfet</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
