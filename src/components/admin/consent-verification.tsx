"use client";

import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProfileConsent, VerificationRecord } from "@/domain/types";
import { ActionButton } from "./action-button";
import { ActionForm, FieldError } from "./action-form";
import { FileInput } from "./file-input";
import { StatusBadge } from "./status-badge";

export const CONSENT_LABELS = { publication: "Yayın yetkilendirmesi", photo_rights: "Fotoğraf kullanım izni", data_processing: "Kişisel veri işleme rızası" } as const;
const VER_LABELS = { age: "Yaş doğrulaması", identity: "Kimlik doğrulaması" } as const;
const VER_STATUS = { pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" } as const;

export function ConsentPanel({
  consents,
  add,
  revoke,
  dates,
}: {
  consents: ProfileConsent[];
  add: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  revoke: Record<string, (input: string) => Promise<ActionResult>>;
  dates: Record<string, string>;
}) {
  return (
    <section className="space-y-4" aria-labelledby="rz">
      <h2 id="rz" className="font-semibold">Rıza kayıtları</h2>
      <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
        {consents.length ? consents.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{CONSENT_LABELS[c.type]}</p>
              <p className="text-xs text-muted-foreground">{c.method} · {dates[c.id]}{c.evidencePath ? " · belge ekli (özel depolama)" : ""}</p>
            </div>
            {c.revokedAt ? <StatusBadge tone="danger">Geri alındı</StatusBadge> : (
              <ActionButton action={revoke[c.id]} size="sm" variant="outline" confirm={{ title: "Rıza geri alınsın mı?", description: "Yayın veya fotoğraf izni geri alınırsa profil derhal yayından kaldırılır.", destructive: true, confirmLabel: "Geri al" }}>
                Geri al
              </ActionButton>
            )}
          </li>
        )) : <li className="p-3 text-sm text-muted-foreground">Rıza kaydı yok.</li>}
      </ul>
      <ActionForm action={add} resetOnSuccess className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
        {({ pending, errors }) => (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="c-type">Rıza türü</Label>
              <Select name="type" defaultValue="publication">
                <SelectTrigger id="c-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONSENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-method">Alınma yöntemi</Label>
              <Input id="c-method" name="method" placeholder="ör. Islak imzalı muvafakatname" required />
              <FieldError errors={errors} name="method" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="c-evidence">Belge (isteğe bağlı, PDF/görsel, en fazla 5 MB, özel depolama)</Label>
              <FileInput id="c-evidence" name="evidence" maxBytes={5 * 1024 * 1024} accept="application/pdf,image/jpeg,image/png,image/webp" />
            </div>
            <Button type="submit" disabled={pending} className="sm:col-span-2 sm:justify-self-end">Rıza kaydı ekle</Button>
          </>
        )}
      </ActionForm>
    </section>
  );
}

export function VerificationPanel({
  records,
  add,
  dates,
}: {
  records: VerificationRecord[];
  add: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  dates: Record<string, string>;
}) {
  return (
    <section className="space-y-4" aria-labelledby="dg">
      <h2 id="dg" className="font-semibold">Doğrulama kayıtları</h2>
      <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
        {records.length ? records.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{VER_LABELS[v.type]}</p>
              <p className="text-xs text-muted-foreground">
                {v.method} · {dates[v.id]}
                {v.documentPath ? ` · belge ${v.retainUntil ? `${dates[`${v.id}-r`]} tarihinde silinecek` : "saklanıyor"}` : " · belge saklanmıyor"}
              </p>
            </div>
            <StatusBadge tone={v.status === "approved" ? "success" : v.status === "rejected" ? "danger" : "warning"}>{VER_STATUS[v.status]}</StatusBadge>
          </li>
        )) : <li className="p-3 text-sm text-muted-foreground">Doğrulama kaydı yok.</li>}
      </ul>
      <ActionForm action={add} resetOnSuccess className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-3">
        {({ pending, errors }) => (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="v-type">Tür</Label>
              <Select name="type" defaultValue="age">
                <SelectTrigger id="v-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-status">Sonuç</Label>
              <Select name="status" defaultValue="approved">
                <SelectTrigger id="v-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VER_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-method">Yöntem</Label>
              <Input id="v-method" name="method" placeholder="ör. Kimlik kartı yüz yüze kontrol" required />
              <FieldError errors={errors} name="method" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="v-doc">Belge (isteğe bağlı, en fazla 5 MB; saklama süresi sonunda otomatik silinir)</Label>
              <FileInput id="v-doc" name="document" maxBytes={5 * 1024 * 1024} accept="application/pdf,image/jpeg,image/png,image/webp" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-note">Not</Label>
              <Input id="v-note" name="note" maxLength={500} />
            </div>
            <Button type="submit" disabled={pending} className="sm:col-span-3 sm:justify-self-end">Doğrulama kaydı ekle</Button>
          </>
        )}
      </ActionForm>
    </section>
  );
}
