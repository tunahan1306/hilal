"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { COUNTRY_CODES, countryName, type CountryCode } from "@/domain/countries";
import { hasActiveFilters, serializeFilters, type ProfileFilters } from "@/domain/filters";
import { useI18n } from "@/i18n/client";
import { fmt, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/routes";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string; country?: CountryCode };
export type FilterMode = { type: "explore" } | { type: "location"; country: CountryCode; il: string };

const ALL = "__all__";
const AGES = [18, 20, 25, 30, 35, 40, 45, 50, 60, 70];

function hrefFor(lang: Locale, mode: FilterMode, f: ProfileFilters): string {
  if (mode.type === "explore") return `${localizedPath(lang, "explore")}${serializeFilters(f)}`;
  const base = localizedPath(lang, "location", { country: mode.country, region: mode.il, locality: f.ilce });
  return `${base}${serializeFilters(f, ["ulke", "il", "ilce"])}`;
}

type Props = {
  mode: FilterMode;
  filters: ProfileFilters;
  provinces: Option[];
  districts: Option[];
  total: number;
  /** Keşifte sunulan ülkeler: yalnızca yayına açık olanlar (sunucuda belirlenir). */
  countries: CountryCode[];
};

/**
 * Filtreler URL query parametreleriyle senkronizedir: sayfa yenilense veya
 * bağlantı paylaşılsa da aynı sonuç görünür. Her değişiklikte sayfa 1'e döner.
 *
 * Masaüstü: sol sütunda yapışkan filtre rayı. Mobil: alt sayfa (bottom sheet).
 */
export function useFilterNavigation({ mode, filters, provinces }: Pick<Props, "mode" | "filters" | "provinces">) {
  const router = useRouter();
  const { lang } = useI18n();
  const [pending, startTransition] = useTransition();
  function update(patch: Partial<ProfileFilters>) {
    const next: ProfileFilters = { ...filters, ...patch, sayfa: 1 };
    if ("ulke" in patch && patch.ulke !== filters.ulke) { next.il = undefined; next.ilce = undefined; }
    if ("il" in patch && patch.il !== filters.il) next.ilce = undefined;
    if (mode.type === "location" && "il" in patch && patch.il && patch.il !== mode.il) {
      const country = provinces.find((p) => p.slug === patch.il)?.country ?? mode.country;
      startTransition(() => router.push(`${localizedPath(lang, "location", { country, region: patch.il! })}${serializeFilters(next, ["ulke", "il", "ilce"])}`, { scroll: false }));
      return;
    }
    startTransition(() => router.replace(hrefFor(lang, mode, next), { scroll: false }));
  }
  function clear() {
    const reset: ProfileFilters = { ilgi: [], dogrulanmis: false, sayfa: 1, il: mode.type === "location" ? mode.il : undefined };
    startTransition(() => router.replace(hrefFor(lang, mode, reset), { scroll: false }));
  }
  return { update, clear, pending };
}

function FilterFields({ mode, filters, provinces, districts, countries, update, idPrefix }: Props & { update: (p: Partial<ProfileFilters>) => void; idPrefix: string }) {
  const { lang, m } = useI18n();
  const f = m.filters;
  const country = mode.type === "location" ? mode.country : filters.ulke;
  const regionOptions = country ? provinces.filter((p) => p.country === country) : provinces;
  return (
    <div className="grid gap-7">
      <Group label={f.location}>
        {mode.type === "explore" ? (
          <Field label={f.country} id={`${idPrefix}-ulke`}>
            <Select value={filters.ulke ?? ALL} onValueChange={(v) => update({ ulke: v === ALL ? undefined : (v as CountryCode) })}>
              <SelectTrigger id={`${idPrefix}-ulke`} className="w-full bg-paper"><SelectValue placeholder={f.allCountries} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{f.allCountries}</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{countryName(c, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field label={f.region} id={`${idPrefix}-il`}>
          <Select value={filters.il ?? ALL} onValueChange={(v) => update({ il: v === ALL ? undefined : v })}>
            <SelectTrigger id={`${idPrefix}-il`} className="w-full bg-paper"><SelectValue placeholder={f.allRegions} /></SelectTrigger>
            <SelectContent className="max-h-80">
              {mode.type === "explore" ? <SelectItem value={ALL}>{f.allRegions}</SelectItem> : null}
              {country
                ? regionOptions.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)
                : COUNTRY_CODES.filter((c) => regionOptions.some((p) => p.country === c)).map((c) => (
                    <SelectGroup key={c}>
                      <SelectLabel>{countryName(c, lang)}</SelectLabel>
                      {regionOptions.filter((p) => p.country === c).map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                    </SelectGroup>
                  ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={f.locality} id={`${idPrefix}-ilce`}>
          <Select value={filters.ilce ?? ALL} onValueChange={(v) => update({ ilce: v === ALL ? undefined : v })} disabled={!filters.il || districts.length === 0}>
            <SelectTrigger id={`${idPrefix}-ilce`} className="w-full bg-paper"><SelectValue placeholder={f.allLocalities} /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL}>{f.allLocalities}</SelectItem>
              {districts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Group>

      <Group label={f.ageRange}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={f.minAge} id={`${idPrefix}-yasmin`} srOnlyLabel>
            <Select value={filters.yasMin ? String(filters.yasMin) : ALL} onValueChange={(v) => update({ yasMin: v === ALL ? undefined : Number(v) })}>
              <SelectTrigger id={`${idPrefix}-yasmin`} className="w-full bg-paper"><SelectValue placeholder={f.min} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{f.min}</SelectItem>
                {AGES.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={f.maxAge} id={`${idPrefix}-yasmax`} srOnlyLabel>
            <Select value={filters.yasMax ? String(filters.yasMax) : ALL} onValueChange={(v) => update({ yasMax: v === ALL ? undefined : Number(v) })}>
              <SelectTrigger id={`${idPrefix}-yasmax`} className="w-full bg-paper"><SelectValue placeholder={f.max} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{f.max}</SelectItem>
                {AGES.slice(1).map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Group>

      <div className="flex items-center justify-between gap-3 border-y border-hairline py-3">
        <Label htmlFor={`${idPrefix}-verified`} className="text-sm font-normal">{f.verifiedOnly}</Label>
        <Switch id={`${idPrefix}-verified`} aria-label={f.verified} checked={filters.dogrulanmis} onCheckedChange={(v) => update({ dogrulanmis: v })} />
      </div>


    </div>
  );
}

/** Masaüstü filtre rayı (lg ve üstü). */
export function FilterRail(props: Props) {
  const { update, clear, pending } = useFilterNavigation(props);
  const { m } = useI18n();
  const active = hasActiveFilters({ ...props.filters, il: props.mode.type === "location" ? undefined : props.filters.il });
  return (
    <aside aria-label={m.filters.title} className="hidden lg:block">
      <div className="sticky top-24">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="eyebrow text-muted-foreground">{m.filters.title}</h2>
          {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden /> : null}
          {active && !pending ? (
            <button type="button" onClick={clear} className="text-xs underline-offset-4 hover:underline">{m.filters.clearAll}</button>
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
  const { lang, m } = useI18n();
  const f = m.filters;
  const { filters, mode, provinces, districts, total } = props;
  const activeCount =
    (mode.type === "explore" && filters.ulke ? 1 : 0) +
    (mode.type === "explore" && filters.il ? 1 : 0) +
    (mode.type === "explore" && filters.ilce ? 1 : 0) +
    (filters.yasMin || filters.yasMax ? 1 : 0) +
    (filters.dogrulanmis ? 1 : 0);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (mode.type === "explore" && filters.ulke) chips.push({ key: "ulke", label: countryName(filters.ulke, lang), remove: () => update({ ulke: undefined }) });
  if (mode.type === "explore" && filters.il) chips.push({ key: "il", label: provinces.find((p) => p.slug === filters.il)?.name ?? filters.il, remove: () => update({ il: undefined }) });
  if (mode.type === "explore" && filters.ilce) chips.push({ key: "ilce", label: districts.find((d) => d.slug === filters.ilce)?.name ?? filters.ilce, remove: () => update({ ilce: undefined }) });
  if (filters.yasMin || filters.yasMax) chips.push({ key: "yas", label: fmt(f.ageChip, { min: filters.yasMin ?? 18, max: filters.yasMax ?? 99 }), remove: () => update({ yasMin: undefined, yasMax: undefined }) });
  if (filters.dogrulanmis) chips.push({ key: "dog", label: f.verified, remove: () => update({ dogrulanmis: false }) });


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          <span>{fmt(f.found, { n: total })}</span>
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline px-3.5 text-sm lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden /> {f.title}
              {activeCount ? <span className="grid size-5 place-items-center rounded-full bg-foreground text-[0.6875rem] tabular-nums text-background">{activeCount}</span> : null}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-xl border-hairline bg-background p-0">
            <SheetHeader className="sticky top-0 z-10 border-b border-hairline bg-background px-5 py-4">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden />
              <SheetTitle className="font-display text-xl font-normal">{f.title}</SheetTitle>
              <SheetDescription>{f.live}</SheetDescription>
            </SheetHeader>
            <div className="px-5 py-6">
              <FilterFields {...props} update={update} idPrefix="m" />
            </div>
            <SheetFooter className="sticky bottom-0 flex-row gap-2 border-t border-hairline bg-background px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {activeCount ? (
                <button type="button" onClick={clear} className="h-11 rounded-md px-4 text-sm underline-offset-4 hover:underline">{f.clear}</button>
              ) : null}
              <SheetClose asChild>
                <button type="button" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground">
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {fmt(f.showResults, { n: total })}
                </button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      {chips.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={f.active}>
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.remove}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary pl-3 pr-2 text-[0.8125rem] transition-colors hover:bg-accent"
                aria-label={fmt(f.remove, { label: c.label })}
              >
                {c.label} <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clear} className="inline-flex min-h-8 items-center px-2 text-[0.8125rem] underline-offset-4 hover:underline lg:hidden">{f.clear}</button>
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
