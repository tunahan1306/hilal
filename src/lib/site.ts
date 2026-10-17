export const SITE = {
  name: "Hilal",
  tagline: "Türkiye'nin sosyal keşif platformu",
  description:
    "Hilal, Türkiye'nin 81 ilinde yetişkinlerin sosyal profillerini şehir ve ilçeye göre keşfetmesini sağlayan bir platformdur.",
  locale: "tr_TR",
};

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", ...opts }).format(new Date(iso));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n);
}

/**
 * Herkese açık iletişim e-postası yalnızca yapılandırılmışsa gösterilir;
 * uydurma veya yer tutucu adres yayımlanmaz.
 */
export function publicContactEmail(env: NodeJS.ProcessEnv = process.env): string | null {
  const v = env.CONTACT_PUBLIC_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !/@example\.(com|org|net)$/i.test(v) ? v : null;
}
