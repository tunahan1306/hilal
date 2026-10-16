import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette } from "@/components/admin/command-palette";
import { MobileAdminNav } from "@/components/admin/mobile-admin-nav";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/server/auth/session";
import { isDemoMode } from "@/server/env";
import { getRepository } from "@/server/repositories";
import { provinceLabel } from "@/server/services/profiles";
import { logoutAction } from "../giris/actions";

// Yönetim sayfaları oturuma bağlıdır; anlık gezinme doğrulamasından çıkarılır.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh bg-background font-sans">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-hairline bg-paper px-3 py-4 lg:flex">
        <div className="mb-6 flex items-center justify-between px-2">
          <Logo href="/admin" />
          <span className="rounded-sm border border-hairline px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">Yönetim</span>
        </div>
        <nav aria-label="Yönetim menüsü" className="flex-1 overflow-y-auto">
          <Suspense fallback={<AdminNav />}>
            <NavWithBadges />
          </Suspense>
        </nav>
        <div className="mt-4 space-y-2 border-t border-hairline px-2 pt-4 text-xs text-muted-foreground">
          {isDemoMode() ? <p className="rounded-sm bg-warning/12 px-2 py-1 text-warning">Demo modu · sentetik veri</p> : null}
          <Link href="/" prefetch={false} className="inline-flex min-h-6 items-center gap-1 hover:text-foreground">Siteyi görüntüle <ArrowUpRight className="size-3" aria-hidden /></Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hairline bg-background/90 px-4 backdrop-blur lg:px-6">
          <MobileAdminNav />
          <Logo href="/admin" className="lg:hidden" />
          <Suspense fallback={<Skeleton className="hidden h-8 w-64 md:block" />}>
            <Palette />
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={<Skeleton className="h-4 w-28" />}>
              <AdminIdentity />
            </Suspense>
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="inline-flex size-10 items-center justify-center rounded-md hover:bg-secondary" aria-label="Çıkış yap" type="submit"><LogOut className="size-4" aria-hidden /></button>
            </form>
          </div>
        </header>
        <main id="icerik" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

async function NavWithBadges() {
  await requireAdmin();
  const repo = getRepository();
  const [reports, profiles, privacy] = await Promise.all([repo.listReports(), repo.listProfiles(), repo.listPrivacyRequests()]);
  return (
    <AdminNav
      badges={{
        "/admin/sikayetler": reports.filter((r) => r.status === "open" || r.status === "appealed").length,
        "/admin/profiller": profiles.filter((p) => p.status === "in_review").length,
        "/admin/talepler": privacy.filter((p) => p.status === "received").length,
      }}
    />
  );
}

async function Palette() {
  await requireAdmin();
  const profiles = await getRepository().listProfiles();
  return <CommandPalette profiles={await Promise.all(profiles.map(async (p) => ({ id: p.id, name: p.nickname, meta: await provinceLabel(p) })))} />;
}

async function AdminIdentity() {
  const admin = await requireAdmin();
  return (
    <span className="mr-1 hidden items-center gap-2 text-[0.8125rem] text-muted-foreground sm:inline-flex">
      <span className="grid size-6 place-items-center rounded-full bg-secondary text-[0.6875rem] font-medium text-foreground">{admin.displayName.slice(0, 1)}</span>
      {admin.displayName}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-20" />
      <Skeleton className="h-72" />
    </div>
  );
}
