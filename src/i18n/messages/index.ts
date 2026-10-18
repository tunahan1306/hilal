// İstemci ve sunucu ortak. Sözlükler küçük ve statiktir; dil başına bir kez birleştirilir.
import { LOCALES, type Locale } from "../config";
import { de } from "./de";
import { en } from "./en";
import { nl } from "./nl";
import { tr, type Messages } from "./tr";

export type { Messages };

const partial: Record<Exclude<Locale, "tr">, unknown> = { en, nl, de };

/** Eksik anahtar: istenen dil → İngilizce → Türkçe (kaynak). Diziler bütün olarak alınır. */
function merge(base: unknown, over: unknown): unknown {
  if (over === undefined || over === null) return base;
  if (typeof base === "string" || Array.isArray(base)) return typeof over === typeof base || Array.isArray(over) ? over : base;
  if (typeof base === "object" && base !== null && typeof over === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(base)) out[k] = merge((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k]);
    return out;
  }
  return base;
}

const cache = new Map<Locale, Messages>();
export function getMessages(lang: Locale): Messages {
  let m = cache.get(lang);
  if (!m) {
    const english = merge(tr, en) as Messages;
    m = lang === "tr" ? tr : lang === "en" ? english : (merge(english, partial[lang]) as Messages);
    cache.set(lang, m);
  }
  return m;
}

/** Eksik çeviri raporu (testler ve geliştirme): kaynakta olup dilde olmayan anahtar yolları. */
export function missingKeys(lang: Exclude<Locale, "tr">): string[] {
  const out: string[] = [];
  const walk = (base: unknown, over: unknown, path: string) => {
    if (typeof base === "string" || Array.isArray(base)) { if (over === undefined) out.push(path); return; }
    if (typeof base === "object" && base) for (const k of Object.keys(base)) walk((base as Record<string, unknown>)[k], (over as Record<string, unknown> | undefined)?.[k], path ? `${path}.${k}` : k);
  };
  walk(tr, partial[lang], "");
  return out;
}

export const ALL_LOCALES = LOCALES;
