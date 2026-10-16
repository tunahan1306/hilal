"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { hasActiveFilters, MAX_AGE_FILTER, serializeFilters, type ProfileFilters } from "@/domain/filters";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string };
export type FilterMode = { type: "explore" } | { type: "location"; il: string };

const ALL = "__all__";
const AGES = [18, 20, 25, 30, 35, 40, 45, 50, 60, 70];

function hrefFor(mode: FilterMode, f: ProfileFilters): string {
  if (mode.type === "explore") return `/kesfet${serializeFilters(f)}`;
  const base = f.ilce ? `/sehir/${mode.il}/${f.ilce}` : `/sehir/${mode.il}`;
  return `${base}${serializeFilters(f, ["il", "ilce"])}`;
}

/**
 * Filtreler URL query parametreleriyle senkronizedir: sayfa yenilense veya
 * bağlantı paylaşılsa da aynı sonuç görünür. Her değişiklikte sayfa 1'e döner.
 */
export function FilterBar({
  mode,
  filters,
  provinces,
  districts,
  interests,
  total,
}: {
  mode: FilterMode;
  filters: ProfileFilters;
  provinces: Option[];
  districts: Option[];
  interests: Option[];
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<ProfileFilters>) {
    const next: ProfileFilters = { ...filters, ...patch, sayfa: 1 };
    if ("il" in patch && patch.il !== filters.il) next.ilce = undefined;
    if (mode.type === "location" && "il" in patch && patch.il && patch.il !== mode.il) {
      startTransition(() => router.push(`/sehir/${patch.il}${serializeFilters(next, ["il", "ilce"])}`, { scroll: false }));
      return;
    }
    startTransition(() => router.replace(hrefFor(mode, next), { scroll: false }));
  }

  function clear() {
    const reset: ProfileFilters = { ilgi: [], dogrulanmis: false, sayfa: 1, il: mode.type === "location" ? mode.il : undefined };
    startTransition(() => router.replace(hrefFor(mode, reset), { scroll: false }));
  }

  const fields = (
    <>
      <Field label="İl" id="f-il">
        <Select value={filters.il ?? ALL} onValueChange={(v) => update({ il: v === ALL ? undefined : v })}>
          <SelectTrigger id="f-il" className="w-full"><SelectValue placeholder="Tüm iller" /></SelectTrigger>
          <SelectContent className="max-h-80">
            {mode.type === "explore" ? <SelectItem value={ALL}>Tüm iller</SelectItem> : null}
            {provinces.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="İlçe" id="f-ilce">
        <Select value={filters.ilce ?? ALL} onValueChange={(v) => update({ ilce: v === ALL ? undefined : v })} disabled={!filters.il || districts.length === 0}>
          <SelectTrigger id="f-ilce" className="w-full"><SelectValue placeholder="Tüm ilçeler" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={ALL}>Tüm ilçeler</SelectItem>
            {districts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="En az yaş" id="f-yasmin">
          <Select value={filters.yasMin ? String(filters.yasMin) : ALL} onValueChange={(v) => update({ yasMin: v === ALL ? undefined : Number(v) })}>
            <SelectTrigger id="f-yasmin" className="w-full"><SelectValue placeholder="18" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Farketmez</SelectItem>
              {AGES.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="En fazla yaş" id="f-yasmax">
          <Select value={filters.yasMax ? String(filters.yasMax) : ALL} onValueChange={(v) => update({ yasMax: v === ALL ? undefined : Number(v) })}>
            <SelectTrigger id="f-yasmax" className="w-full"><SelectValue placeholder={String(MAX_AGE_FILTER)} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Farketmez</SelectItem>
              {AGES.slice(1).map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2 lg:h-10 lg:self-end">
        <Label htmlFor="f-verified" className="flex items-center gap-1.5 text-sm font-normal">
          <BadgeCheck className="size-4 text-brand" aria-hidden /> Doğrulanmış
        </Label>
        <Switch id="f-verified" checked={filters.dogrulanmis} onCheckedChange={(v) => update({ dogrulanmis: v })} />
      </div>
    </>
  );

  const interestChips = (
    <fieldset>
      <legend className="sr-only">İlgi alanları</legend>
      <div className="flex flex-wrap gap-2">
        {interests.map((i) => {
          const on = filters.ilgi.includes(i.slug);
          return (
            <button
              key={i.slug}
              type="button"
              aria-pressed={on}
              onClick={() => update({ ilgi: on ? filters.ilgi.filter((s) => s !== i.slug) : [...filters.ilgi, i.slug].slice(0, 5) })}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-sm transition-colors",
                on ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:bg-accent",
              )}
            >
              {i.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const active = hasActiveFilters({ ...filters, il: mode.type === "location" ? undefined : filters.il });

  return (
    <section aria-label="Filtreler" className="space-y-4">
      {/* Masaüstü */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">{fields}</div>
      <div className="hidden lg:block">{interestChips}</div>

      {/* Mobil */}
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 justify-center">
              <SlidersHorizontal className="size-4" aria-hidden /> Filtreler
              {active ? <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">•</span> : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filtreler</SheetTitle>
              <SheetDescription>Sonuçlar seçimlerinize göre anında güncellenir.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              {fields}
              <div>
                <p className="mb-2 text-sm font-medium">İlgi alanları</p>
                {interestChips}
              </div>
            </div>
            <SheetFooter className="pb-safe">
              <SheetClose asChild>
                <Button size="lg">{pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}{total} sonucu göster</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {active ? (
          <Button variant="ghost" onClick={clear}><X className="size-4" aria-hidden /> Temizle</Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
        <span className="flex items-center gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {total} profil bulundu
        </span>
        {active ? (
          <button type="button" onClick={clear} className="hidden rounded-sm underline-offset-4 hover:text-foreground hover:underline lg:inline">
            Filtreleri temizle
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
