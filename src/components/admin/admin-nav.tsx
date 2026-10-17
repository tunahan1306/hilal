"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, ClipboardList, CreditCard, Flag, Inbox, LayoutDashboard, Search, Settings, ShieldCheck, Tags, Users, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon; shortcut?: string };
export const ADMIN_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Genel", items: [{ href: "/admin", label: "Gösterge paneli", icon: LayoutDashboard, shortcut: "G P" }] },
  {
    title: "İçerik",
    items: [
      { href: "/admin/profiller", label: "Profiller", icon: Users, shortcut: "G R" },
      { href: "/admin/ilgi-alanlari", label: "İlgi alanları", icon: Tags },
    ],
  },
  {
    title: "Güven",
    items: [
      { href: "/admin/sikayetler", label: "Şikâyetler", icon: Flag, shortcut: "G S" },
      { href: "/admin/talepler", label: "KVKK talepleri", icon: ShieldCheck },
      { href: "/admin/iletisim", label: "İletişim talepleri", icon: Inbox, shortcut: "G I" },
    ],
  },
  { title: "Ticari", items: [{ href: "/admin/abonelikler", label: "Abonelikler", icon: CreditCard }] },
  {
    title: "Sistem",
    items: [
      { href: "/admin/seo", label: "SEO", icon: Search },
      { href: "/admin/denetim", label: "Denetim kayıtları", icon: ClipboardList },
      { href: "/admin/istatistik", label: "İstatistikler", icon: BarChart3 },
      { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
    ],
  },
];
export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function AdminNav({ onNavigate, badges = {} }: { onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <div className="grid gap-5">
      {ADMIN_NAV_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">{g.title}</p>
          <ul className="grid gap-px">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      active && "bg-secondary font-medium text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    <span className="flex-1 truncate">{label}</span>
                    {badges[href] ? (
                      <span className="rounded-sm bg-destructive/12 px-1.5 text-[0.6875rem] font-medium tabular-nums text-destructive">{badges[href]}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
