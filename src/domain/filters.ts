import { z } from "zod";
import { MINIMUM_AGE } from "./age";

export const MAX_AGE_FILTER = 99;
export const PAGE_SIZE = 12;

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);

export type ProfileFilters = {
  il?: string;
  ilce?: string;
  yasMin?: number;
  yasMax?: number;
  ilgi: string[];
  dogrulanmis: boolean;
  sayfa: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toAge(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, MINIMUM_AGE), MAX_AGE_FILTER);
}

/** URL query parametrelerini güvenli şekilde ayrıştırır; geçersiz değerler yok sayılır. */
export function parseFilters(params: RawParams): ProfileFilters {
  const il = slug.safeParse(first(params.il));
  const ilce = slug.safeParse(first(params.ilce));
  const ilgiRaw = params.ilgi;
  const ilgiList = (Array.isArray(ilgiRaw) ? ilgiRaw : ilgiRaw ? ilgiRaw.split(",") : [])
    .map((s) => s.trim())
    .filter((s) => slug.safeParse(s).success)
    .slice(0, 5);
  let yasMin = toAge(first(params.yasMin));
  let yasMax = toAge(first(params.yasMax));
  if (yasMin !== undefined && yasMax !== undefined && yasMin > yasMax) [yasMin, yasMax] = [yasMax, yasMin];
  const sayfa = Math.min(Math.max(Number.parseInt(first(params.sayfa) ?? "1", 10) || 1, 1), 500);
  return {
    il: il.success ? il.data : undefined,
    ilce: il.success && ilce.success ? ilce.data : undefined,
    yasMin,
    yasMax,
    ilgi: [...new Set(ilgiList)],
    dogrulanmis: first(params.dogrulanmis) === "1",
    sayfa,
  };
}

/** Filtreleri kararlı sırayla query string'e çevirir (boş değerler atlanır). */
export function serializeFilters(f: Partial<ProfileFilters>, omit: (keyof ProfileFilters)[] = []): string {
  const sp = new URLSearchParams();
  const skip = new Set(omit);
  if (f.il && !skip.has("il")) sp.set("il", f.il);
  if (f.ilce && !skip.has("ilce")) sp.set("ilce", f.ilce);
  if (f.yasMin !== undefined && !skip.has("yasMin")) sp.set("yasMin", String(f.yasMin));
  if (f.yasMax !== undefined && !skip.has("yasMax")) sp.set("yasMax", String(f.yasMax));
  if (f.ilgi?.length && !skip.has("ilgi")) sp.set("ilgi", f.ilgi.join(","));
  if (f.dogrulanmis && !skip.has("dogrulanmis")) sp.set("dogrulanmis", "1");
  if (f.sayfa && f.sayfa > 1 && !skip.has("sayfa")) sp.set("sayfa", String(f.sayfa));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: ProfileFilters): boolean {
  return Boolean(f.il || f.ilce || f.yasMin !== undefined || f.yasMax !== undefined || f.ilgi.length || f.dogrulanmis);
}
