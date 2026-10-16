import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileAdminNav } from "@/components/admin/mobile-admin-nav";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/server/auth/session";
import { isDemoMode } from "@/server/env";
import { logoutAction } from "../giris/actions";

// Yönetim sayfaları oturuma bağlıdır; anlık gezinme doğrulamasından çıkarılır.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border/70 bg-background p-4 lg:flex">
        <Logo href="/admin" className="mb-6 px-2" />
        <nav aria-label="Yönetim menüsü"><AdminNav /></nav>
        <div className="mt-auto space-y-2 px-2 text-xs text-muted-foreground">
          {isDemoMode() ? <p className="rounded-md bg-warning/15 px-2 py-1 text-warning">Demo modu — sentetik veri</p> : null}
          <Link href="/" className="underline-offset-4 hover:underline">Siteyi görüntüle ↗</Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur">
          <MobileAdminNav />
          <Logo href="/admin" className="lg:hidden" />
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={<Skeleton className="h-4 w-28" />}>
              <AdminIdentity />
            </Suspense>
            <ThemeToggle />
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" aria-label="Çıkış yap" type="submit"><LogOut className="size-4" aria-hidden /></Button>
            </form>
          </div>
        </header>
        <main id="icerik" className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

async function AdminIdentity() {
  const admin = await requireAdmin();
  return <span className="hidden text-sm text-muted-foreground sm:inline">{admin.displayName}</span>;
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
    </div>
  );
}
