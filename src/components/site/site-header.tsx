import { Suspense } from "react";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { SEGMENTS, localizedPath } from "@/i18n/routes";
import { AgeBadge } from "./age-badge";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { NavLinks, NavLinksFallback } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const { lang, m } = await getI18n();
  const items = [
    { href: localizedPath(lang, "explore"), label: m.nav.explore },
    { href: localizedPath(lang, "cities"), label: m.nav.cities, alsoActive: `/${lang}/${SEGMENTS[lang].location}/` },
    { href: localizedPath(lang, "safety"), label: m.nav.community },
    { href: localizedPath(lang, "contact"), label: m.nav.contact },
  ];
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-hairline bg-background/88 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        {m.common.skipToContent}
      </a>
      <div className="container-page flex h-14 items-center gap-8 lg:h-16">
        <Logo href={localizedPath(lang, "home")} label={`Hilal — ${m.common.home}`} />
        <nav aria-label={m.nav.main} className="hidden md:block">
          <Suspense fallback={<NavLinksFallback items={items} />}>
            <NavLinks items={items} />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <Link href={`${localizedPath(lang, "safety")}#yetiskin`} className="inline-flex items-center rounded-full" aria-label={m.nav.ageBadge}>
            <AgeBadge label={m.common.adultsOnly} />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
