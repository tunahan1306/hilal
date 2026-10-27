"use client";

import { useActionState } from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import type { AppUser } from "@/domain/identity";
import { logoutAction, submitAgeVerificationAction, type AuthState } from "../auth/actions";

export function AccountPanel({ user, ageVerified }: { user: AppUser; ageVerified: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(submitAgeVerificationAction, null);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-10 font-sans">
      <h1 className="text-xl font-semibold tracking-tight">Hesabım</h1>
      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">E-posta</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">E-posta doğrulaması</dt>
          <dd>{user.emailVerifiedAt ? "Doğrulandı" : "Bekliyor"}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">Yaş doğrulaması</dt>
          <dd>{ageVerified ? "Doğrulandı" : "Bekliyor"}</dd>
        </div>
      </dl>

      {!ageVerified ? (
        <section className="mt-8 rounded-lg border border-hairline p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden /> Yaş doğrulama
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Yaş doğrulama sağlayıcısı henüz seçilmedi; bu adım şu an hiçbir kullanıcı için tamamlanamaz.
          </p>
          <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-3" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="providerSessionRef">Sağlayıcı oturum referansı</Label>
              <Input id="providerSessionRef" name="providerSessionRef" required disabled />
            </div>
            {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
            <Button type="submit" variant="outline" disabled>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Gönder (devre dışı)
            </Button>
          </form>
        </section>
      ) : null}

      <form action={logoutAction} className="mt-8">
        <Button type="submit" variant="ghost">
          <LogOut className="size-4" aria-hidden /> Çıkış yap
        </Button>
      </form>
    </main>
  );
}
