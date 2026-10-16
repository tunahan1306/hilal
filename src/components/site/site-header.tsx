import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AgeBadge } from "./age-badge";
import { Logo } from "./logo";
import { NavLinks, NavLinksFallback } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export const MAIN_NAV = [
  { href: "/kesfet", label: "Keşfet" },
  { href: "/sehirler", label: "Şehirler" },
  { href: "/guvenlik", label: "Topluluk" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/88 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        İçeriğe geç
      </a>
      <div className="container-page flex h-14 items-center gap-8 lg:h-16">
        <Logo />
        <nav aria-label="Ana menü" className="hidden md:block">
          <Suspense fallback={<NavLinksFallback items={MAIN_NAV} />}>
            <NavLinks items={MAIN_NAV} />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/kesfet"
            className="hidden h-9 items-center gap-2 rounded-md border border-hairline px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground md:inline-flex"
          >
            <Search className="size-4" aria-hidden /> Şehir veya ilgi alanı ara
          </Link>
          <Link href="/kesfet" className="inline-flex size-10 items-center justify-center rounded-md md:hidden" aria-label="Profil ara">
            <Search className="size-[1.15rem]" aria-hidden />
          </Link>
          <Link href="/guvenlik#yetiskin" className="inline-flex items-center rounded-full" aria-label="Yalnızca yetişkinler — topluluk kuralları">
            <AgeBadge />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
