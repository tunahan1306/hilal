"use client";

import type { ActionResult } from "@/app/admin/(panel)/actions";
import type { SeoPage, SiteSettings } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, FieldError } from "./action-form";

type Act = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function InterestForm({ action }: { action: Act }) {
  return (
    <ActionForm action={action} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      {({ pending, errors }) => (
        <>
          <div className="grid gap-1.5"><Label htmlFor="i-name">Ad</Label><Input id="i-name" name="name" required maxLength={40} /><FieldError errors={errors} name="name" /></div>
          <div className="grid gap-1.5"><Label htmlFor="i-desc">Açıklama</Label><Input id="i-desc" name="description" maxLength={120} /></div>
          <Button type="submit" disabled={pending}>Ekle</Button>
        </>
      )}
    </ActionForm>
  );
}

export function SeoPageForm({ action, page, path }: { action: Act; page?: SeoPage | null; path?: string }) {
  const idx = page?.indexOverride === null || page?.indexOverride === undefined ? "auto" : page.indexOverride ? "index" : "noindex";
  return (
    <ActionForm action={action} className="grid gap-3">
      {({ pending, errors }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`p-${path}`}>Yol</Label>
              <Input id={`p-${path}`} name="path" defaultValue={page?.path ?? path ?? "/sehir/"} readOnly={Boolean(page)} placeholder="/sehir/istanbul" />
              <FieldError errors={errors} name="path" />
            </div>
            <div className="grid gap-1.5">
              <Label>İndeks durumu</Label>
              <Select name="indexOverride" defaultValue={idx}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Otomatik (içerik yeterliyse index)</SelectItem>
                  <SelectItem value="index">Her zaman index</SelectItem>
                  <SelectItem value="noindex">noindex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Başlık (≤70)</Label><Input name="title" maxLength={70} defaultValue={page?.title ?? ""} /></div>
            <div className="grid gap-1.5"><Label>Canonical</Label><Input name="canonical" defaultValue={page?.canonical ?? ""} placeholder="/sehir/istanbul" /><FieldError errors={errors} name="canonical" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Açıklama (≤160)</Label><Textarea name="description" rows={2} maxLength={160} defaultValue={page?.description ?? ""} /></div>
          <div className="grid gap-1.5">
            <Label>Özgün tanıtım metni</Label>
            <Textarea name="intro" rows={3} maxLength={2000} defaultValue={page?.intro ?? ""} placeholder="Bu şehre özgü, elle yazılmış içerik. Şablon metin kopyalamayın." />
          </div>
          <Button type="submit" disabled={pending} className="justify-self-end">Kaydet</Button>
        </>
      )}
    </ActionForm>
  );
}

export function SettingsForm({ action, settings }: { action: Act; settings: SiteSettings }) {
  return (
    <ActionForm action={action} className="grid max-w-xl gap-4">
      {({ pending, errors }) => (
        <>
          <div className="grid gap-1.5"><Label htmlFor="st-name">Site adı</Label><Input id="st-name" name="siteName" defaultValue={settings.siteName} /><FieldError errors={errors} name="siteName" /></div>
          <div className="grid gap-1.5"><Label htmlFor="st-mail">Destek e-postası</Label><Input id="st-mail" name="supportEmail" type="email" defaultValue={settings.supportEmail} /><FieldError errors={errors} name="supportEmail" /></div>
          <Label className="flex items-center gap-2 font-normal"><Checkbox name="reportsEnabled" defaultChecked={settings.reportsEnabled} /> Ziyaretçi şikâyet formu açık</Label>
          <Button type="submit" disabled={pending} className="justify-self-start">Kaydet</Button>
        </>
      )}
    </ActionForm>
  );
}
