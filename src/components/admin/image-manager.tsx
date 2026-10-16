"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ShieldCheck, ShieldOff, Trash2, Upload } from "lucide-react";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileImage } from "@/domain/types";
import { ActionButton } from "./action-button";
import { ActionForm } from "./action-form";
import { StatusBadge } from "./status-badge";

type BoundImageAction = (input: string) => Promise<ActionResult>;

export function ImageManager({
  images,
  limit,
  upload,
  actions,
}: {
  images: ProfileImage[];
  limit: number;
  upload: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  actions: Record<string, { confirm: BoundImageAction; unconfirm: BoundImageAction; remove: BoundImageAction; up: BoundImageAction; down: BoundImageAction }>;
}) {
  return (
    <div className="space-y-6">
      <ActionForm action={upload} resetOnSuccess className="grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {({ pending }) => (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="file">Fotoğraf (JPEG/PNG/WebP, en fazla 5 MB)</Label>
              <Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={images.length >= limit} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alt">Alternatif metin</Label>
              <Input id="alt" name="alt" maxLength={160} placeholder="Görselin kısa açıklaması" />
            </div>
            <Button type="submit" disabled={pending || images.length >= limit}><Upload className="size-4" aria-hidden /> Yükle</Button>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              {images.length}/{limit} fotoğraf (paket sınırı). Metadata (EXIF/GPS) silinir, görsel WebP olarak yeniden kodlanır. Yeni görseller hak doğrulanana kadar yayında görünmez.
            </p>
          </>
        )}
      </ActionForm>

      {images.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => {
            const a = actions[img.id];
            return (
              <li key={img.id} className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="relative aspect-[4/5] bg-muted">
                  <Image src={img.url} alt={img.alt} fill sizes="240px" className="object-cover" />
                  <span className="absolute left-2 top-2">
                    {img.rightsConfirmed ? <StatusBadge tone="success">Hak doğrulandı</StatusBadge> : <StatusBadge tone="warning">Hak bekliyor</StatusBadge>}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 p-2">
                  {img.rightsConfirmed ? (
                    <ActionButton action={a.unconfirm} size="sm" variant="ghost"><ShieldOff className="size-3.5" aria-hidden /> Geri al</ActionButton>
                  ) : (
                    <ActionButton action={a.confirm} size="sm" variant="outline"><ShieldCheck className="size-3.5" aria-hidden /> Hakkı doğrula</ActionButton>
                  )}
                  <ActionButton action={a.up} size="icon-sm" variant="ghost" aria-label="Yukarı taşı" disabled={i === 0}><ArrowUp className="size-3.5" aria-hidden /></ActionButton>
                  <ActionButton action={a.down} size="icon-sm" variant="ghost" aria-label="Aşağı taşı" disabled={i === images.length - 1}><ArrowDown className="size-3.5" aria-hidden /></ActionButton>
                  <ActionButton action={a.remove} size="icon-sm" variant="ghost" aria-label="Sil" confirm={{ title: "Fotoğraf silinsin mi?", description: "Dosya depolamadan kalıcı olarak silinir.", destructive: true, confirmLabel: "Sil" }}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Henüz fotoğraf yok.</p>}
    </div>
  );
}
