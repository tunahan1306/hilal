"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, countryName, type CountryCode } from "@/domain/countries";
import { normalizeTr } from "@/domain/text";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { localizedPath } from "@/i18n/routes";
import { cn } from "@/lib/utils";

export type CityOption = { slug: string; name: string; plate: number; country: CountryCode; count: number };

/** Erişilebilir, aranabilir şehir/bölge seçici (combobox). Ülkelere göre gruplanır; seçimde bölge sayfasına gider. */
export function CityPicker({ cities, className, size = "lg" }: { cities: CityOption[]; className?: string; size?: "lg" | "default" }) {
  const router = useRouter();
  const { lang, m } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => {
    const q = normalizeTr(query);
    const list = q
      ? cities.filter((c) => normalizeTr(c.name).includes(q) || (COUNTRIES[c.country].showPlate && String(c.plate).padStart(2, "0") === q))
      : cities;
    return list.slice(0, 200);
  }, [cities, query]);

  function go(c: CityOption) {
    setOpen(false);
    router.push(localizedPath(lang, "location", { country: c.country, region: c.slug }));
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(""); setActive(0); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          role="combobox"
          aria-label={m.picker.choose}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn("h-12 w-full justify-between rounded-md border-input bg-paper px-4 font-normal text-muted-foreground hover:bg-paper hover:text-foreground", className)}
        >
          <span className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {m.picker.choose}</span>
          <ChevronsUpDown className="size-4 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && filtered[active]) { e.preventDefault(); go(filtered[active]); }
            }}
            placeholder={m.picker.search}
            aria-label={m.picker.searchLabel}
            aria-controls="city-listbox"
            aria-activedescendant={filtered[active] ? `city-${filtered[active].slug}` : undefined}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="city-listbox" role="listbox" aria-label={m.picker.list} className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">{m.picker.none}</li> : null}
          {filtered.map((c, i) => (
            <li
              key={c.slug}
              id={`city-${c.slug}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(c)}
              className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm", i === active && "bg-accent text-accent-foreground")}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-6 shrink-0 text-xs uppercase tabular-nums text-muted-foreground">{COUNTRIES[c.country].showPlate ? String(c.plate).padStart(2, "0") : c.country}</span>
                <span className="truncate">{c.name}</span>
                <span className="sr-only">, {countryName(c.country, lang)}</span>
              </span>
              {c.count > 0 ? <span className="shrink-0 text-xs text-muted-foreground">{fmt(m.common.profiles, { n: c.count })}</span> : <Check className="invisible size-4" aria-hidden />}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
