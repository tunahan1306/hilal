"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { enrollMfa, loginAction, verifyMfaAction, type LoginState } from "./actions";

export function LoginForm({ step, demo }: { step: "login" | "mfa" | "mfa-kurulum"; demo: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(step === "login" ? loginAction : verifyMfaAction, null);
  const [enroll, setEnroll] = useState<{ qr: string; secret: string } | { error: string } | null>(null);

  useEffect(() => {
    if (step === "mfa-kurulum") void enrollMfa().then(setEnroll);
  }, [step]);

  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="grid gap-4" noValidate>
      {step === "login" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        </>
      ) : null}
      {step === "mfa-kurulum" ? (
        <div className="rounded-lg border border-border p-4 text-sm">
          <p className="mb-3">Yönetici hesapları için iki adımlı doğrulama zorunludur. Kimlik doğrulayıcı uygulamanızla QR kodu tarayın.</p>
          {enroll && "qr" in enroll ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="TOTP kurulum QR kodu" className="mx-auto size-44 rounded bg-white p-2" />
              <p className="mt-2 break-all text-center font-mono text-xs text-muted-foreground">{enroll.secret}</p>
            </>
          ) : enroll && "error" in enroll ? (
            <p className="text-destructive">{enroll.error}</p>
          ) : (
            <Loader2 className="mx-auto size-5 animate-spin" aria-label="Yükleniyor" />
          )}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="totp">Doğrulama kodu (TOTP)</Label>
        <Input id="totp" name="totp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="123456" required={step !== "login" || demo} />
      </div>
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LockKeyhole className="size-4" aria-hidden />}
        {step === "login" ? "Giriş yap" : "Doğrula"}
      </Button>
    </form>
  );
}
