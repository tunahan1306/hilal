"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { hasActiveFilters, serializeFilters, type ProfileFilters } from "@/domain/filters";
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

type Props = {
  mode: FilterMode;
  filters: ProfileFilters;
  provinces: Option[];
  districts: Option[];
  total: number;
};

/**
 * Filtreler URL query parametreleriyle senkronizedir: sayfa yenilense veya
 * bağlantı paylaşılsa da aynı sonuç görünür. Her değişiklikte sayfa 1'e döner.
 *
 * Masaüstü: sol sütunda yapışkan filtre rayı. Mobil: alt sayfa (bottom sheet).
 */
export function useFilterNavigation({ mode, filters }: Pick<Props, "mode" | "filters">) {
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
  return { update, clear, pending };
}

function FilterFields({ mode, filters, provinces, districts, update, idPrefix }: Props & { update: (p: Partial<ProfileFilters>) => void; idPrefix: string }) {
  return (
    <div className="grid gap-7">
      <Group label="Konum">
        <Field label="İl" id={`${idPrefix}-il`}>
          <Select value={filters.il ?? ALL} onValueChange={(v) => update({ il: v === ALL ? undefined : v })}>
            <SelectTrigger id={`${idPrefix}-il`} className="w-full bg-paper"><SelectValue placeholder="Tüm iller" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {mode.type === "explore" ? <SelectItem value={ALL}>Tüm iller</SelectItem> : null}
              {provinces.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="İlçe" id={`${idPrefix}-ilce`}>
          <Select value={filters.ilce ?? ALL} onValueChange={(v) => update({ ilce: v === ALL ? undefined : v })} disabled={!filters.il || districts.length === 0}>
            <SelectTrigger id={`${idPrefix}-ilce`} className="w-full bg-paper"><SelectValue placeholder="Tüm ilçeler" /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL}>Tüm ilçeler</SelectItem>
              {districts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Group>

      <Group label="Yaş aralığı">
        <div className="grid grid-cols-2 gap-2">
          <Field label="En az yaş" id={`${idPrefix}-yasmin`} srOnlyLabel>
            <Select value={filters.yasMin ? String(filters.yasMin) : ALL} onValueChange={(v) => update({ yasMin: v === ALL ? undefined : Number(v) })}>
              <SelectTrigger id={`${idPrefix}-yasmin`} className="w-full bg-paper"><SelectValue placeholder="En az" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>En az</SelectItem>
                {AGES.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="En fazla yaş" id={`${idPrefix}-yasmax`} srOnlyLabel>
            <Select value={filters.yasMax ? String(filters.yasMax) : ALL} onValueChange={(v) => update({ yasMax: v === ALL ? undefined : Number(v) })}>
              <SelectTrigger id={`${idPrefix}-yasmax`} className="w-full bg-paper"><SelectValue placeholder="En fazla" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>En fazla</SelectItem>
                {AGES.slice(1).map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Group>

      <div className="flex items-center justify-between gap-3 border-y border-hairline py-3">
        <Label htmlFor={`${idPrefix}-verified`} className="text-sm font-normal">Yalnızca kimliği doğrulanmış</Label>
        <Switch id={`${idPrefix}-verified`} aria-label="Doğrulanmış" checked={filters.dogrulanmis} onCheckedChange={(v) => update({ dogrulanmis: v })} />
      </div>


    </div>
  );
}

/** Masaüstü filtre rayı (lg ve üstü). */
export function FilterRail(props: Props) {
  const { update, clear, pending } = useFilterNavigation(props);
  const active = hasActiveFilters({ ...props.filters, il: props.mode.type === "location" ? undefined : props.filters.il });
  return (
    <aside aria-label="Filtreler" className="hidden lg:block">
      <div className="sticky top-24">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="eyebrow text-muted-foreground">Filtreler</h2>
          {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden /> : null}
          {active && !pending ? (
            <button type="button" onClick={clear} className="text-xs underline-offset-4 hover:underline">Filtreleri temizle</button>
          ) : null}
        </div>
        <FilterFields {...props} update={update} idPrefix="f" />
      </div>
    </aside>
  );
}

/** Sonuç çubuğu: sayı, etkin filtre çipleri, mobil filtre düğmesi. */
export function FilterBar(props: Props) {
  const { update, clear, pending } = useFilterNavigation(props);
  const { filters, mode, provinces, districts, total } = props;
  const activeCount =
    (mode.type === "explore" && filters.il ? 1 : 0) +
    (mode.type === "explore" && filters.ilce ? 1 : 0) +
    (filters.yasMin || filters.yasMax ? 1 : 0) +
    (filters.dogrulanmis ? 1 : 0);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (mode.type === "explore" && filters.il) chips.push({ key: "il", label: provinces.find((p) => p.slug === filters.il)?.name ?? filters.il, remove: () => update({ il: undefined }) });
  if (mode.type === "explore" && filters.ilce) chips.push({ key: "ilce", label: districts.find((d) => d.slug === filters.ilce)?.name ?? filters.ilce, remove: () => update({ ilce: undefined }) });
  if (filters.yasMin || filters.yasMax) chips.push({ key: "yas", label: `${filters.yasMin ?? 18}–${filters.yasMax ?? "99"} yaş`, remove: () => update({ yasMin: undefined, yasMax: undefined }) });
  if (filters.dogrulanmis) chips.push({ key: "dog", label: "Doğrulanmış", remove: () => update({ dogrulanmis: false }) });


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          <span><span className="tabular-nums text-foreground">{total}</span> profil bulundu</span>
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline px-3.5 text-sm lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden /> Filtreler
              {activeCount ? <span className="grid size-5 place-items-center rounded-full bg-foreground text-[0.6875rem] tabular-nums text-background">{activeCount}</span> : null}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-xl border-hairline bg-background p-0">
            <SheetHeader className="sticky top-0 z-10 border-b border-hairline bg-background px-5 py-4">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden />
              <SheetTitle className="font-display text-xl font-normal">Filtreler</SheetTitle>
              <SheetDescription>Sonuçlar seçimlerinize göre anında güncellenir.</SheetDescription>
            </SheetHeader>
            <div className="px-5 py-6">
              <FilterFields {...props} update={update} idPrefix="m" />
            </div>
            <SheetFooter className="pb-safe sticky bottom-0 flex-row gap-2 border-t border-hairline bg-background px-5 py-4">
              {activeCount ? (
                <button type="button" onClick={clear} className="h-11 rounded-md px-4 text-sm underline-offset-4 hover:underline">Temizle</button>
              ) : null}
              <SheetClose asChild>
                <button type="button" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground">
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {total} sonucu göster
                </button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      {chips.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etkin filtreler">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.remove}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary pl-3 pr-2 text-[0.8125rem] transition-colors hover:bg-accent"
                aria-label={`${c.label} filtresini kaldır`}
              >
                {c.label} <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clear} className="inline-flex min-h-8 items-center px-2 text-[0.8125rem] underline-offset-4 hover:underline lg:hidden">Temizle</button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="eyebrow mb-3 text-muted-foreground">{label}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, id, children, srOnlyLabel = false }: { label: string; id: string; children: React.ReactNode; srOnlyLabel?: boolean }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className={cn("text-xs font-normal text-muted-foreground", srOnlyLabel && "sr-only")}>{label}</Label>
      {children}
    </div>
  );
}
