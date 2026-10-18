"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, fmt } from "@/i18n/config";
import { parseLocalized, switchLocale } from "@/i18n/routes";

/**
 * Dil seçici: aynı sayfanın seçilen dildeki adresine gider. Konum (ülke/bölge) ve
 * filtreler korunur; dil seçimi konumu değiştirmez. Belge gezinmesi kullanılır ki
 * kök layout (html lang, sözlük) yeniden kurulsun.
 */
export function LanguageSwitcher() {
  const { lang, m } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const parsed = parseLocalized(pathname);
  const target = (l: (typeof LOCALES)[number]) => {
    const path = parsed?.kind === "route" ? switchLocale(parsed.parsed, l) : `/${l}`;
    return search ? `${path}?${search}` : path;
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 gap-1.5 px-2.5 uppercase" aria-label={fmt(m.common.languageMenu, { current: LOCALE_NAMES[lang] })}>
          <Languages className="size-4" aria-hidden /> <span className="text-xs font-medium tracking-wide">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} asChild>
            <a href={target(l)} hrefLang={l} lang={l} aria-current={l === lang ? "true" : undefined} className="flex items-center justify-between gap-3">
              {LOCALE_NAMES[l]} {l === lang ? <Check className="size-4" aria-hidden /> : null}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
