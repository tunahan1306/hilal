"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExportButton({ action, filename }: { action: () => Promise<ActionResult>; filename: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (!res?.ok) return void toast.error(res?.message ?? "Hata");
          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
          toast.success("Veri dışa aktarıldı.");
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} Verileri dışa aktar (JSON)
    </Button>
  );
}

export function DeleteProfileDialog({ slug, action }: { slug: string; action: (confirmSlug: string, reason: string) => Promise<ActionResult> }) {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive"><Trash2 className="size-4" aria-hidden /> Kalıcı olarak sil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profil kalıcı olarak silinsin mi?</DialogTitle>
          <DialogDescription>Profil, fotoğraflar, rıza belgeleri ve doğrulama belgeleri geri alınamaz şekilde silinir. Denetim kaydında yalnızca kimlik ve gerekçe kalır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="del-reason">Gerekçe (ör. KVKK silme talebi no)</Label>
            <Input id="del-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="del-slug">Onaylamak için <code className="rounded bg-muted px-1">{slug}</code> yazın</Label>
            <Input id="del-slug" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Vazgeç</Button></DialogClose>
          <Button
            variant="destructive"
            disabled={pending || confirm !== slug || reason.trim().length < 5}
            onClick={() => start(async () => { const r = await action(confirm, reason); if (r && !r.ok) toast.error(r.message); })}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Kalıcı olarak sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
