import { Suspense } from "react";
import Link from "next/link";
import { AgeBadge } from "./age-badge";
import { Logo } from "./logo";
import { NavLinks, NavLinksFallback } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export const MAIN_NAV = [
  { href: "/kesfet", label: "Keşfet" },
  { href: "/sehirler", label: "Şehirler" },
  { href: "/guvenlik", label: "Topluluk" },
  { href: "/iletisim", label: "İletişim" },
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
          <Link href="/guvenlik#yetiskin" className="inline-flex items-center rounded-full" aria-label="Yalnızca yetişkinler — topluluk kuralları">
            <AgeBadge />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
