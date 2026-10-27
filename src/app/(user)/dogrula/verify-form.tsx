"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { verifyEmailAction, type AuthState } from "../auth/actions";

export function VerifyEmailForm({ defaultToken, defaultEmail }: { defaultToken: string; defaultEmail: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyEmailAction, null);

  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="grid gap-4" noValidate>
      <input type="hidden" name="email" defaultValue={defaultEmail} />
      <div className="grid gap-1.5">
        <Label htmlFor="token">Doğrulama jetonu</Label>
        <Input id="token" name="token" defaultValue={defaultToken} required autoFocus />
      </div>
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        Doğrula
      </Button>
    </form>
  );
}
