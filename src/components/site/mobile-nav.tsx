"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, MapPin, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { SEGMENTS, localizedPath } from "@/i18n/routes";
import { cn } from "@/lib/utils";

/** Mobilde tek elle kullanım için alt navigasyon. */
export function MobileNav() {
  const { lang, m } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: localizedPath(lang, "home"), label: m.nav.home, icon: Home, exact: true },
    { href: localizedPath(lang, "explore"), label: m.nav.explore, icon: Compass },
    { href: localizedPath(lang, "cities"), label: m.nav.cities, icon: MapPin, also: `/${lang}/${SEGMENTS[lang].location}/` },
    { href: localizedPath(lang, "safety"), label: m.nav.community, icon: ShieldCheck },
  ];
  return (
    <nav aria-label={m.nav.mobile} className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/92 backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon, exact, also }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`) || Boolean(also && pathname.startsWith(also));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] tracking-wide text-muted-foreground", active && "text-foreground")}
              >
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2 : 1.6} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
