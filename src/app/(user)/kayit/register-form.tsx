"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { registerAction, type AuthState } from "../auth/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, null);

  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <p className="text-xs text-muted-foreground">En az 12 karakter.</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="tosAccepted" required className="mt-0.5 size-4 shrink-0" />
        <span>
          <Link href="/terms" className="underline underline-offset-4">
            Kullanım şartlarını
          </Link>{" "}
          okudum, kabul ediyorum.
        </span>
      </label>
      {state ? (
        <div role="alert" className="text-sm text-destructive">
          <p>{state.message}</p>
          {state.devToken ? <p className="mt-1 font-mono text-xs text-muted-foreground">Demo jetonu: {state.devToken}</p> : null}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        Kayıt ol
      </Button>
    </form>
  );
}
