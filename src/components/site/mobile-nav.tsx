"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Ana sayfa", icon: Home },
  { href: "/kesfet", label: "Keşfet", icon: Compass },
  { href: "/sehirler", label: "Şehirler", icon: MapPin },
  { href: "/guvenlik", label: "Güvenlik", icon: ShieldCheck },
] as const;

/** Mobilde tek elle kullanım için alt navigasyon. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobil menü"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/sehirler" && pathname.startsWith("/sehir/"));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] text-muted-foreground transition-colors",
                  active && "text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "text-brand")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
