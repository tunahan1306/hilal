"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };
const base = "relative inline-flex h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground";

export function NavLinks({ items }: { items: readonly Item[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-6">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/sehirler" && pathname.startsWith("/sehir/"));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(base, active && "text-foreground after:absolute after:inset-x-0 after:-bottom-[13px] after:h-px after:bg-foreground lg:after:-bottom-[17px]")}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** usePathname dinamik olduğundan statik shell için etkin durum içermeyen yedek. */
export function NavLinksFallback({ items }: { items: readonly Item[] }) {
  return (
    <ul className="flex items-center gap-6">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={base}>{item.label}</Link>
        </li>
      ))}
    </ul>
  );
}
