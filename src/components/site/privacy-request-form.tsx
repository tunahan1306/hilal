"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { privacyRequestAction, type FormState } from "@/app/(site)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIVACY_REQUEST_LABELS, PRIVACY_REQUEST_TYPES } from "@/domain/types";
import { preservingSubmit } from "@/hooks/use-preserving-submit";

export function PrivacyRequestForm({ defaultProfileUrl }: { defaultProfileUrl?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(privacyRequestAction, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 border-y border-hairline py-10">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p>{state.message}</p>
      </div>
    );
  }
  const err = (k: string) => state?.errors?.[k]?.[0];
  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="grid gap-5 border-t border-hairline pt-8" noValidate>
      <div className="hidden" aria-hidden>
        <label>Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pr-type">Başvuru türü</Label>
        <Select name="type" defaultValue="removal">
          <SelectTrigger id="pr-type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIVACY_REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{PRIVACY_REQUEST_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pr-url">İlgili profil bağlantısı <span className="font-normal text-muted-foreground">(varsa)</span></Label>
        <Input id="pr-url" name="profileUrl" defaultValue={defaultProfileUrl} placeholder="https://…/profil/…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pr-name">Ad soyad</Label>
          <Input id="pr-name" name="requesterName" autoComplete="name" required aria-invalid={Boolean(err("requesterName"))} />
          {err("requesterName") ? <p className="text-sm text-destructive">{err("requesterName")}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pr-email">E-posta</Label>
          <Input id="pr-email" name="requesterEmail" type="email" autoComplete="email" required aria-invalid={Boolean(err("requesterEmail"))} />
          {err("requesterEmail") ? <p className="text-sm text-destructive">{err("requesterEmail")}</p> : null}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pr-rel">Profille ilişkiniz</Label>
        <Select name="relation" defaultValue="self">
          <SelectTrigger id="pr-rel" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">Profil sahibiyim</SelectItem>
            <SelectItem value="representative">Profil sahibinin yasal temsilcisiyim</SelectItem>
            <SelectItem value="other">Diğer (ör. fotoğrafım izinsiz kullanılıyor)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pr-details">Açıklama</Label>
        <Textarea id="pr-details" name="details" rows={5} required aria-invalid={Boolean(err("details"))} />
        {err("details") ? <p className="text-sm text-destructive">{err("details")}</p> : null}
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="pr-ack" name="acknowledge" aria-invalid={Boolean(err("acknowledge"))} />
        <Label htmlFor="pr-ack" className="text-sm font-normal leading-snug">
          KVKK aydınlatma metnini okudum; başvurumun değerlendirilmesi için kimliğimi doğrulamak amacıyla benimle iletişime geçilebileceğini anlıyorum.
        </Label>
      </div>
      {err("acknowledge") ? <p className="-mt-3 text-sm text-destructive">{err("acknowledge")}</p> : null}
      {state && !state.ok ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Başvuruyu gönder
      </Button>
    </form>
  );
}
