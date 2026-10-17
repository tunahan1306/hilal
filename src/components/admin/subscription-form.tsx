"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionForm, FieldError } from "./action-form";

export function SubscriptionForm({
  action,
  profiles,
  plans,
  defaultProfileId,
  today,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  profiles: { id: string; name: string }[];
  plans: { id: string; name: string; sponsoredEligible: boolean }[];
  defaultProfileId?: string;
  today: string;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const eligible = plans.find((p) => p.id === planId)?.sponsoredEligible ?? false;
  return (
    <ActionForm action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      {({ pending, errors }) => (
        <>
          <div className="grid gap-1.5 lg:col-span-3">
            <Label htmlFor="s-profile">Profil</Label>
            <Select name="profileId" defaultValue={defaultProfileId}>
              <SelectTrigger id="s-profile" className="w-full"><SelectValue placeholder="Profil seçin" /></SelectTrigger>
              <SelectContent className="max-h-80">{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError errors={errors} name="profileId" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-plan">Paket</Label>
            <Select name="planId" value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="s-plan" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-start">Başlangıç</Label>
            <Input id="s-start" name="startsAt" type="date" defaultValue={today} />
            <FieldError errors={errors} name="startsAt" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-months">Süre (ay)</Label>
            <Input id="s-months" name="months" type="number" min={1} max={24} defaultValue={1} />
            <FieldError errors={errors} name="months" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2 lg:col-span-5">
            <Label className="flex items-center gap-2 font-normal"><Checkbox name="autoRenew" /> Otomatik yenileme (kayıt amaçlı)</Label>
            <Label className="flex items-center gap-2 font-normal" aria-disabled={!eligible}>
              <Checkbox name="sponsored" disabled={!eligible} /> Sponsorlu görünürlük {eligible ? "" : "(bu pakette yok)"}
            </Label>
            <Input name="note" aria-label="Not" placeholder="Not (isteğe bağlı)" className="max-w-xs" />
          </div>
          <Button type="submit" disabled={pending} className="sm:col-span-2 lg:col-span-1">Kaydet</Button>
        </>
      )}
    </ActionForm>
  );
}
