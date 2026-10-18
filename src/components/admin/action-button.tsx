"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: (input: string) => Promise<ActionResult>;
  /** Onay penceresi; `prompt` verilirse kullanıcıdan metin (gerekçe) istenir */
  confirm?: { title: string; description?: string; prompt?: string; confirmLabel?: string; destructive?: boolean; /** Gerekçe zorunluysa en az karakter sayısı */ minLength?: number; /** Sayı girişi (ör. ay) */ number?: { min: number; max: number } };
};

export function ActionButton({ action, confirm, children, ...props }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function exec(input: string) {
    start(async () => {
      const res = await action(input);
      if (res?.ok) {
        toast.success(res.message);
        setOpen(false);
        setText("");
        router.refresh();
      } else if (res) toast.error(res.message);
    });
  }

  const button = (
    <Button {...props} disabled={pending || props.disabled} onClick={confirm ? undefined : () => exec("")}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
  if (!confirm) return button;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirm.title}</DialogTitle>
          {confirm.description ? <DialogDescription>{confirm.description}</DialogDescription> : null}
        </DialogHeader>
        {confirm.prompt ? (
          <div className="grid gap-1.5">
            <Label htmlFor="ab-text">{confirm.prompt}</Label>
            {confirm.number ? (
              <Input id="ab-text" type="number" inputMode="numeric" min={confirm.number.min} max={confirm.number.max} value={text} onChange={(e) => setText(e.target.value)} className="w-32" />
            ) : <Textarea id="ab-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} required={Boolean(confirm.minLength)} aria-describedby={confirm.minLength ? "ab-text-hint" : undefined} />}
            {confirm.minLength ? <p id="ab-text-hint" className="text-xs text-muted-foreground">Zorunlu · en az {confirm.minLength} karakter ({text.trim().length}/{confirm.minLength})</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Vazgeç</Button></DialogClose>
          <Button variant={confirm.destructive ? "destructive" : "default"} disabled={pending || (confirm.minLength ? text.trim().length < confirm.minLength : false) || (confirm.number ? !(Number(text) >= confirm.number.min && Number(text) <= confirm.number.max && Number.isInteger(Number(text))) : false)} onClick={() => exec(text)}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {confirm.confirmLabel ?? "Onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
