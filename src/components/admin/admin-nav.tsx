"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, CreditCard, Flag, LayoutDashboard, Search, Settings, ShieldCheck, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Gösterge paneli", icon: LayoutDashboard },
  { href: "/admin/profiller", label: "Profiller", icon: Users },
  { href: "/admin/sikayetler", label: "Şikâyetler", icon: Flag },
  { href: "/admin/abonelikler", label: "Abonelikler", icon: CreditCard },
  { href: "/admin/talepler", label: "KVKK talepleri", icon: ShieldCheck },
  { href: "/admin/ilgi-alanlari", label: "İlgi alanları", icon: Tags },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/denetim", label: "Denetim kayıtları", icon: ClipboardList },
  { href: "/admin/istatistik", label: "İstatistikler", icon: BarChart3 },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-0.5">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent font-medium text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
