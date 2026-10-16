"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { scanProfileContent } from "@/domain/content-policy";
import { listDistricts, listProvinces } from "@/domain/locations";
import { profileInputSchema } from "@/domain/schemas";
import type { Interest } from "@/domain/types";

type FormIn = z.input<typeof profileInputSchema>;
type FormOut = z.output<typeof profileInputSchema>;
const NONE = "__none__";

export function ProfileForm({
  action,
  interests,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  interests: Interest[];
  defaults?: Partial<FormIn>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const provinces = useMemo(() => listProvinces(), []);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: { nickname: "", birthDate: "", provincePlate: 0, districtSlug: "", bio: "", interestIds: [], seoTitle: "", seoDescription: "", noindex: false, ...defaults },
    mode: "onBlur",
  });
  const { register, control, handleSubmit, setValue, formState } = form;
  const plate = Number(useWatch({ control, name: "provincePlate" }));
  const districts = useMemo(() => (plate ? listDistricts(plate) : []), [plate]);
  const nickname = useWatch({ control, name: "nickname" });
  const bio = useWatch({ control, name: "bio" });
  const findings = useMemo(() => scanProfileContent({ nickname: nickname ?? "", bio: bio ?? "" }), [nickname, bio]);

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("nickname", values.nickname);
    fd.set("birthDate", values.birthDate);
    fd.set("provincePlate", String(values.provincePlate));
    fd.set("districtSlug", values.districtSlug ?? "");
    fd.set("bio", values.bio);
    fd.set("whatsappPhone", values.whatsappPhone ?? "");
    fd.set("whatsappConsent", values.whatsappConsent ? "true" : "false");
    for (const id of values.interestIds) fd.append("interestIds", id);
    fd.set("seoTitle", values.seoTitle ?? "");
    fd.set("seoDescription", values.seoDescription ?? "");
    fd.set("noindex", values.noindex ? "true" : "false");
    start(async () => {
      const res = await action(null, fd);
      if (!res) return;
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
        for (const [k, v] of Object.entries(res.errors ?? {})) form.setError(k as keyof FormIn, { message: v[0] });
      }
    });
  });

  const err = (k: keyof FormIn) => formState.errors[k]?.message as string | undefined;

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Takma ad" id="nickname" error={err("nickname")} hint="Gerçek ad kullanılmaz.">
          <Input id="nickname" {...register("nickname")} aria-invalid={Boolean(err("nickname"))} />
        </Field>
        <Field label="Doğum tarihi" id="birthDate" error={err("birthDate")} hint="Yalnızca yönetimde saklanır; sitede yaş olarak görünür.">
          <Input id="birthDate" type="date" {...register("birthDate")} aria-invalid={Boolean(err("birthDate"))} />
        </Field>
        <Field label="İl" id="provincePlate" error={err("provincePlate")}>
          <Controller
            control={control}
            name="provincePlate"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => { field.onChange(Number(v)); setValue("districtSlug", ""); }}>
                <SelectTrigger id="provincePlate" className="w-full" aria-invalid={Boolean(err("provincePlate"))}><SelectValue placeholder="İl seçin" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {provinces.map((p) => <SelectItem key={p.plate} value={String(p.plate)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="İlçe" id="districtSlug" error={err("districtSlug")}>
          <Controller
            control={control}
            name="districtSlug"
            render={({ field }) => (
              <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)} disabled={!districts.length}>
                <SelectTrigger id="districtSlug" className="w-full"><SelectValue placeholder="İlçe (isteğe bağlı)" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                  {districts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-md border border-hairline p-4">
        <legend className="px-2 text-sm font-medium">WhatsApp iletişimi (isteğe bağlı)</legend>
        <Field label="WhatsApp telefon numarası" id="whatsappPhone" error={err("whatsappPhone")} hint="Örnek: +90 5XX XXX XX XX. İzin yoksa numara kamuya gösterilmez.">
          <Input id="whatsappPhone" type="tel" autoComplete="off" maxLength={40} {...register("whatsappPhone", { onChange: () => setValue("whatsappConsent", false) })} aria-invalid={Boolean(err("whatsappPhone"))} />
        </Field>
        <Controller control={control} name="whatsappConsent" render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox id="whatsappConsent" checked={field.value ?? false} onCheckedChange={(value) => field.onChange(value === true)} />
            <Label htmlFor="whatsappConsent" className="text-sm font-normal leading-relaxed">Profil sahibinin bu numaranın WhatsApp iletişimi için paylaşılmasına açık yazılı iznini aldım.</Label>
          </div>
        )} />
        <p className="text-xs text-muted-foreground">Numara veya izin değişikliği, yayındaki profili yeniden moderasyona alır. Ücretli hizmet tanıtımı ve yönlendirme yasaktır.</p>
      </fieldset>

      <Field label="Biyografi" id="bio" error={err("bio")} hint="20–600 karakter. İletişim bilgisi, fiyat veya ücretli hizmet çağrışımı içeremez.">
        <Textarea id="bio" rows={5} {...register("bio")} aria-invalid={Boolean(err("bio"))} />
      </Field>

      {findings.length ? (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-warning" aria-hidden /> İçerik politikası uyarıları</p>
          <ul className="mt-1 list-disc pl-6">
            {findings.map((f) => (
              <li key={f.rule}>{f.message} — “{f.match}” {f.severity === "block" ? <strong>(yayını engeller)</strong> : "(moderatör incelemesi)"}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">İlgi alanları <span className="font-normal text-muted-foreground">(en fazla 8)</span></legend>
        <Controller
          control={control}
          name="interestIds"
          render={({ field }) => {
            const value = field.value ?? [];
            return (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {interests.map((i) => (
                  <Label key={i.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-normal">
                    <Checkbox
                      checked={value.includes(i.id)}
                      onCheckedChange={(c) => field.onChange(c ? [...value, i.id] : value.filter((x) => x !== i.id))}
                    />
                    {i.name}
                  </Label>
                ))}
              </div>
            );
          }}
        />
        {err("interestIds") ? <p className="mt-1 text-sm text-destructive">{err("interestIds")}</p> : null}
      </fieldset>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">SEO ayarları</summary>
        <div className="mt-4 grid gap-4">
          <Field label="SEO başlığı" id="seoTitle" error={err("seoTitle")} hint="Boş bırakılırsa otomatik oluşturulur (en fazla 70).">
            <Input id="seoTitle" {...register("seoTitle")} maxLength={70} />
          </Field>
          <Field label="SEO açıklaması" id="seoDescription" error={err("seoDescription")} hint="En fazla 160 karakter.">
            <Textarea id="seoDescription" rows={2} {...register("seoDescription")} maxLength={160} />
          </Field>
          <Controller
            control={control}
            name="noindex"
            render={({ field }) => (
              <Label className="flex items-center gap-3 text-sm font-normal">
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} /> Arama motorlarında indekslenmesin (noindex)
              </Label>
            )}
          />
        </div>
      </details>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
