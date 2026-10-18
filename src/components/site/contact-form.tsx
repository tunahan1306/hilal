"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { contactAction, type FormState } from "@/server/actions/public";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_CATEGORIES, CONTACT_LIMITS, type ContactCategory } from "@/domain/types";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routes";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { cn } from "@/lib/utils";

type Field = "name" | "email" | "subject" | "message" | "acknowledge" | "category";

/** Sunucu doğrulamasının (zod) kullanıcı dostu ön kontrolü; asıl karar sunucudadır. */
function clientCheck(fd: FormData, v: Messages["contact"]["v"]): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  const text = (k: string) => String(fd.get(k) ?? "").trim();
  if (!fd.get("category")) errors.category = v.category;
  if (text("name").length < 2) errors.name = v.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email"))) errors.email = v.email;
  if (text("subject").length < 3) errors.subject = v.subject;
  if (text("message").length < 20) errors.message = v.message;
  for (const k of ["name", "subject", "message"] as const) if (/[<>]/.test(text(k))) errors[k] = v.html;
  if (fd.get("acknowledge") !== "on") errors.acknowledge = v.acknowledge;
  return errors;
}

export function ContactForm({ defaultCategory }: { defaultCategory?: ContactCategory }) {
  const [state, action, pending] = useActionState<FormState, FormData>(contactAction, null);
  const { lang, m } = useI18n();
  const c = m.contact;
  const startedAt = useRef<HTMLInputElement>(null);
  // Sunucu ve istemci render çıktısı aynı kalsın diye zaman damgası mount sonrası yazılır.
  useEffect(() => { if (startedAt.current) startedAt.current.value = String(Date.now()); }, []);
  const [local, setLocal] = useState<Partial<Record<Field, string>>>({});
  const [length, setLength] = useState(0);

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-lg border border-hairline bg-card p-6 sm:p-8">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <h2 className="font-display text-display-sm">{c.thanks}</h2>
        <p className="text-muted-foreground">{state.message}</p>
        <Button asChild variant="outline"><Link href={localizedPath(lang, "home")}>{c.backHome}</Link></Button>
      </div>
    );
  }

  const err = (k: Field) => local[k] ?? state?.errors?.[k]?.[0];
  const submit = preservingSubmit(action);
  const describedBy = (k: Field, extra?: string) => [err(k) ? `ct-${k}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const found = clientCheck(new FormData(e.currentTarget), c.v);
        setLocal(found);
        if (Object.keys(found).length) {
          e.preventDefault();
          const first = e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`);
          first?.focus();
          return;
        }
        if (pending) { e.preventDefault(); return; }
        submit(e);
      }}
      className="grid gap-6"
      noValidate
      aria-busy={pending}
    >
      <div className="hidden" aria-hidden>
        <label>Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <input ref={startedAt} type="hidden" name="startedAt" defaultValue="" />
      <input type="hidden" name="lang" value={lang} />

      <fieldset className="grid gap-3" aria-describedby={describedBy("category")}>
        <legend className="mb-1 text-sm font-medium">{c.category}</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_CATEGORIES.map((cat) => (
            <label key={cat} className="relative">
              <input type="radio" name="category" value={cat} defaultChecked={cat === (defaultCategory ?? "general")} className="peer sr-only" />
              <span
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-hairline bg-paper px-4 text-sm transition-colors",
                  "hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-foreground",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                )}
              >
                {c.categories[cat]}
              </span>
            </label>
          ))}
        </div>
        {err("category") ? <p id="ct-category-error" className="text-sm text-destructive">{err("category")}</p> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="name" label={c.name} autoComplete="name" maxLength={CONTACT_LIMITS.name} error={err("name")} />
        <TextField id="email" label={c.emailLabel} type="email" autoComplete="email" inputMode="email" maxLength={CONTACT_LIMITS.email} error={err("email")} />
      </div>
      <TextField id="subject" label={c.subject} maxLength={CONTACT_LIMITS.subject} error={err("subject")} />

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="ct-message">{c.message}</Label>
          <span id="ct-message-count" className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{length}/{CONTACT_LIMITS.message}</span>
        </div>
        <Textarea
          id="ct-message"
          name="message"
          rows={7}
          required
          minLength={20}
          maxLength={CONTACT_LIMITS.message}
          onChange={(e) => setLength(e.target.value.length)}
          aria-invalid={Boolean(err("message"))}
          aria-describedby={describedBy("message", "ct-message-count")}
        />
        {err("message") ? <p id="ct-message-error" className="text-sm text-destructive">{err("message")}</p> : null}
      </div>

      <p className="text-sm text-muted-foreground">
        {c.privacyText.split(/(\{privacy\}|\{removal\})/).map((part, i) =>
          part === "{privacy}" ? <Link key={i} href={localizedPath(lang, "privacy")} className="text-foreground underline underline-offset-4">{c.privacyLink}</Link>
          : part === "{removal}" ? <Link key={i} href={localizedPath(lang, "removal")} className="text-foreground underline underline-offset-4">{c.removalLink}</Link>
          : part)}
      </p>
      <div className="grid gap-1.5">
        <div className="flex items-start gap-3">
          <Checkbox id="ct-acknowledge" name="acknowledge" aria-invalid={Boolean(err("acknowledge"))} aria-describedby={describedBy("acknowledge")} />
          <Label htmlFor="ct-acknowledge" className="text-sm font-normal leading-snug">
            {c.acknowledge}
          </Label>
        </div>
        {err("acknowledge") ? <p id="ct-acknowledge-error" className="text-sm text-destructive">{err("acknowledge")}</p> : null}
      </div>

      {state && !state.ok ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">{state.message}</p> : null}
      <div>
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {pending ? c.sending : c.submit}
        </Button>
      </div>
    </form>
  );
}

function TextField({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`ct-${id}`}>{label}</Label>
      <Input id={`ct-${id}`} name={id} required aria-invalid={Boolean(error)} aria-describedby={error ? `ct-${id}-error` : undefined} {...props} />
      {error ? <p id={`ct-${id}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
