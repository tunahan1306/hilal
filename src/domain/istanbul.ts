// İstemci paketine de girer; yalnızca saf veri ve yardımcılar içerir.

export const ISTANBUL_SLUG = "istanbul";

export const ISTANBUL_SIDES = {
  avrupa: {
    name: "İstanbul Avrupa",
    districts: [
      "arnavutkoy", "avcilar", "bagcilar", "bahcelievler", "bakirkoy", "basaksehir", "bayrampasa", "besiktas",
      "beylikduzu", "beyoglu", "buyukcekmece", "catalca", "esenler", "esenyurt", "eyupsultan", "fatih",
      "gaziosmanpasa", "gungoren", "kagithane", "kucukcekmece", "sariyer", "silivri", "sultangazi", "sisli", "zeytinburnu",
    ],
  },
  anadolu: {
    name: "İstanbul Anadolu",
    districts: [
      "adalar", "atasehir", "beykoz", "cekmekoy", "kadikoy", "kartal", "maltepe", "pendik",
      "sancaktepe", "sultanbeyli", "sile", "tuzla", "umraniye", "uskudar",
    ],
  },
} as const;

export type IstanbulSide = keyof typeof ISTANBUL_SIDES;
export const ISTANBUL_SIDE_KEYS = Object.keys(ISTANBUL_SIDES) as IstanbulSide[];
export const DEFAULT_ISTANBUL_SIDE: IstanbulSide = "avrupa";

export function isIstanbulSide(v: unknown): v is IstanbulSide {
  return typeof v === "string" && Object.hasOwn(ISTANBUL_SIDES, v);
}

/** Yaka filtresi yalnızca İstanbul geneli listelemede (ilçe seçili değilken) uygulanır. */
export function sideDistricts(filters: { il?: string; ilce?: string; yaka?: IstanbulSide }): readonly string[] | undefined {
  return filters.il === ISTANBUL_SLUG && !filters.ilce && filters.yaka ? ISTANBUL_SIDES[filters.yaka].districts : undefined;
}
