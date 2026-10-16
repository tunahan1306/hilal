"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeTr } from "@/domain/text";
import { cn } from "@/lib/utils";

export type CityOption = { slug: string; name: string; plate: number; count: number };

/** Erişilebilir, aranabilir il seçici (combobox). Seçimde il sayfasına gider. */
export function CityPicker({ cities, className, size = "lg" }: { cities: CityOption[]; className?: string; size?: "lg" | "default" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => {
    const q = normalizeTr(query);
    const list = q ? cities.filter((c) => normalizeTr(c.name).includes(q) || String(c.plate).padStart(2, "0") === q) : cities;
    return list.slice(0, 81);
  }, [cities, query]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/sehir/${slug}`);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(""); setActive(0); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn("w-full justify-between bg-card font-normal text-muted-foreground", className)}
        >
          <span className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> Şehir seçin</span>
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
              if (e.key === "Enter" && filtered[active]) { e.preventDefault(); go(filtered[active].slug); }
            }}
            placeholder="İl adı veya plaka…"
            aria-label="İl ara"
            aria-controls="city-listbox"
            aria-activedescendant={filtered[active] ? `city-${filtered[active].slug}` : undefined}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="city-listbox" role="listbox" aria-label="İller" className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sonuç bulunamadı</li> : null}
          {filtered.map((c, i) => (
            <li
              key={c.slug}
              id={`city-${c.slug}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(c.slug)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm",
                i === active && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-xs tabular-nums text-muted-foreground">{String(c.plate).padStart(2, "0")}</span>
                {c.name}
              </span>
              {c.count > 0 ? (
                <span className="text-xs text-muted-foreground">{c.count} profil</span>
              ) : (
                <Check className="invisible size-4" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
