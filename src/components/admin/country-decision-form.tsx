"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PUBLICATION_STATUS_LABELS, PUBLICATION_STATUSES, type PublicationStatus } from "@/domain/country-policy";
import { ActionForm, FieldError } from "./action-form";

type Act = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * Ülke yayın kararı formu. "Yayına izinli" kararı sorumlu kişi, belge referansı ve gözden geçirme
 * tarihi ister; sunucu ve veritabanı aynı kuralları ayrıca uygular. Kayıt geri alınamaz; yeni karar eklenir.
 */
export function CountryDecisionForm({ action, code, name }: { action: Act; code: string; name: string }) {
  const [status, setStatus] = useState<PublicationStatus>("not_reviewed");
  const id = (k: string) => `cd-${code}-${k}`;
  const permitted = status === "permitted";
  return (
    <ActionForm action={action} resetOnSuccess className="grid gap-4">
      {({ pending, errors }) => (
        <>
          <input type="hidden" name="countryCode" value={code} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={id("status")}>Yeni durum</Label>
              <Select name="status" value={status} onValueChange={(v) => setStatus(v as PublicationStatus)}>
                <SelectTrigger id={id("status")} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PUBLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{PUBLICATION_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={id("approver")}>Sorumlu kişi (hukuki değerlendirmeyi yapan / onaylayan)</Label>
              <Input id={id("approver")} name="approverName" required maxLength={120} />
              <FieldError errors={errors} name="approverName" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={id("evidence")}>Dayanak belge referansı{permitted ? " (zorunlu)" : ""}</Label>
              <Input id={id("evidence")} name="evidenceRef" required={permitted} maxLength={500} placeholder="ör. hukuki görüş dosya no / tarih" />
              <FieldError errors={errors} name="evidenceRef" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={id("due")}>Bir sonraki gözden geçirme tarihi{permitted ? " (zorunlu)" : ""}</Label>
              <Input id={id("due")} name="reviewDue" type="date" required={permitted} />
              <FieldError errors={errors} name="reviewDue" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={id("restrictions")}>Kısıtlar</Label>
            <Textarea id={id("restrictions")} name="restrictions" maxLength={1000} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={id("note")}>Not</Label>
            <Textarea id={id("note")} name="note" maxLength={1000} rows={2} />
          </div>
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor={id("confirm")}>Onay: ülke kodunu yazın ({code})</Label>
            <Input id={id("confirm")} name="confirm" required autoComplete="off" pattern={code} />
            <FieldError errors={errors} name="confirm" />
          </div>
          <p className="text-xs text-muted-foreground">
            Bu kayıt bir hukuki onay üretmez; yalnızca gerçekleşmiş bir değerlendirmeyi belgeler. Kararlar değiştirilemez veya silinemez.
            {permitted ? ` ${name} için izin verilirse onaylı profiller hemen yayına girebilir.` : ` ${name} kapalıysa yayındaki profiller hemen kamuya kapanır.`}
          </p>
          <div><Button type="submit" disabled={pending} variant={permitted ? "default" : "outline"}>Kararı kaydet</Button></div>
        </>
      )}
    </ActionForm>
  );
}
