"use client";

import { useActionState, useId } from "react";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";
import { reportProfileAction, type FormState } from "@/server/actions/public";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_CATEGORIES } from "@/domain/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { preservingSubmit } from "@/hooks/use-preserving-submit";

export function ReportDialog({ profileId, nickname }: { profileId: string; nickname: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportProfileAction, null);
  const descId = useId();
  const { lang, m } = useI18n();
  const r = m.report;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-md border-hairline bg-transparent px-4"><Flag className="size-4" aria-hidden /> {r.trigger}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fmt(r.title, { name: nickname })}</DialogTitle>
          <DialogDescription>
            {r.description}
          </DialogDescription>
        </DialogHeader>
        {state?.ok ? (
          <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-10 text-success" aria-hidden />
            <p className="text-sm">{state.message}</p>
          </div>
        ) : (
          <form action={action} onSubmit={preservingSubmit(action)} className="grid gap-5" noValidate>
            <input type="hidden" name="profileId" value={profileId} />
            <input type="hidden" name="lang" value={lang} />
            <div className="hidden" aria-hidden>
              <label>Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{r.reason}</legend>
              <RadioGroup name="category" required className="grid gap-1.5 sm:grid-cols-2" aria-invalid={Boolean(state?.errors?.category)}>
                {REPORT_CATEGORIES.map((c) => (
                  <Label key={c} htmlFor={`rc-${c}`} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 text-sm font-normal has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent">
                    <RadioGroupItem id={`rc-${c}`} value={c} />
                    {r.categories[c]}
                  </Label>
                ))}
              </RadioGroup>
              {state?.errors?.category ? <p className="text-sm text-destructive">{state.errors.category[0]}</p> : null}
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor={descId}>{r.details}</Label>
              <Textarea id={descId} name="description" rows={4} required minLength={10} maxLength={1000} placeholder={r.detailsPlaceholder} aria-invalid={Boolean(state?.errors?.description)} />
              {state?.errors?.description ? <p className="text-sm text-destructive">{state.errors.description[0]}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${descId}-email`}>{r.email} <span className="font-normal text-muted-foreground">{r.emailOptional}</span></Label>
              <Input id={`${descId}-email`} name="reporterEmail" type="email" autoComplete="email" aria-invalid={Boolean(state?.errors?.reporterEmail)} />
              {state?.errors?.reporterEmail ? <p className="text-sm text-destructive">{state.errors.reporterEmail[0]}</p> : null}
            </div>
            {state && !state.ok ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {r.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
