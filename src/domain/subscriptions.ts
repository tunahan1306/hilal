import type { MembershipPlan, Subscription, SubscriptionStatus } from "./types";

export const DEFAULT_PLANS: Omit<MembershipPlan, "id">[] = [
  {
    code: "basic",
    name: "Basic",
    description: "Standart profil görünürlüğü ve temel profil özellikleri; fotoğraf galerisi.",
    storageQuotaMb: 300,
    sponsoredEligible: false,
    advancedStats: false,
    customization: false,
    priceMonthlyTry: 0,
    active: true,
  },
  {
    code: "plus",
    name: "Plus",
    description: "Geliştirilmiş profil sunumu, genişletilmiş medya alanı (video dahil) ve sponsorlu görünürlük seçeneği.",
    storageQuotaMb: 1500,
    sponsoredEligible: true,
    advancedStats: false,
    customization: false,
    priceMonthlyTry: 0,
    active: true,
  },
  {
    code: "premium",
    name: "Premium",
    description: "Gelişmiş profil kişiselleştirme, sponsorlu alanlar ve ilave istatistikler.",
    storageQuotaMb: 5000,
    sponsoredEligible: true,
    advancedStats: true,
    customization: true,
    priceMonthlyTry: 0,
    active: true,
  },
];

export const EXPIRING_SOON_DAYS = 7;
const DAY = 86_400_000;

/** Kayıtlı durumu ve tarihleri birlikte değerlendirerek güncel durumu döndürür. */
export function effectiveStatus(sub: Pick<Subscription, "status" | "startsAt" | "endsAt">, now: Date): SubscriptionStatus {
  if (sub.status === "cancelled") return "cancelled";
  const start = Date.parse(sub.startsAt);
  const end = Date.parse(sub.endsAt);
  if (now.getTime() < start) return "scheduled";
  if (now.getTime() >= end) return "expired";
  return "active";
}

export function isExpiringSoon(sub: Pick<Subscription, "status" | "startsAt" | "endsAt">, now: Date): boolean {
  if (effectiveStatus(sub, now) !== "active") return false;
  return Date.parse(sub.endsAt) - now.getTime() <= EXPIRING_SOON_DAYS * DAY;
}

/** Yenileme: mevcut bitişten (veya süresi dolmuşsa bugünden) itibaren ay ekler. */
export function renewalPeriod(sub: Pick<Subscription, "endsAt">, months: number, now: Date): { startsAt: string; endsAt: string } {
  if (!Number.isInteger(months) || months < 1 || months > 24) throw new Error("Geçersiz yenileme süresi");
  const base = Math.max(Date.parse(sub.endsAt), now.getTime());
  const start = new Date(base);
  const end = new Date(base);
  end.setUTCMonth(end.getUTCMonth() + months);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function canCancel(sub: Pick<Subscription, "status" | "startsAt" | "endsAt">, now: Date): boolean {
  const s = effectiveStatus(sub, now);
  return s === "active" || s === "scheduled";
}

/** Sponsorlu görünürlük yalnızca uygun pakette ve aktif abonelikte geçerlidir. */
export function isSponsoredNow(sub: Subscription | undefined, plan: MembershipPlan | undefined, now: Date): boolean {
  if (!sub || !plan) return false;
  return sub.sponsored && plan.sponsoredEligible && effectiveStatus(sub, now) === "active";
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  scheduled: "Planlandı",
  active: "Aktif",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
};
