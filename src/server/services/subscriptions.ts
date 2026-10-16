import "server-only";
import { subscriptionInputSchema } from "@/domain/schemas";
import { canCancel, effectiveStatus, renewalPeriod } from "@/domain/subscriptions";
import type { Admin } from "@/domain/types";
import { getRepository } from "../repositories";
import { audit } from "./audit";
import { DomainError } from "./errors";

/**
 * Abonelik kayıtları. İlk sürümde tahsilat YAPILMAZ: bu kayıtlar yalnızca
 * yönetim tarafından tutulan görünürlük paketleridir. Ödeme entegrasyonu,
 * hukuki inceleme ve ödeme kuruluşu onayından sonra `PaymentProvider`
 * arayüzü üzerinden eklenecektir (bkz. src/server/payments.ts).
 */
export async function createSubscription(actor: Admin, raw: unknown) {
  const input = subscriptionInputSchema.parse(raw);
  const repo = getRepository();
  const [profile, plans, existing] = await Promise.all([
    repo.getProfile(input.profileId),
    repo.listPlans(),
    repo.listSubscriptions({ profileId: input.profileId }),
  ]);
  if (!profile) throw new DomainError("Profil bulunamadı");
  const plan = plans.find((p) => p.id === input.planId && p.active);
  if (!plan) throw new DomainError("Geçersiz paket");
  if (input.sponsored && !plan.sponsoredEligible) throw new DomainError(`${plan.name} paketi sponsorlu görünürlük içermez`);
  const now = new Date();
  const start = new Date(`${input.startsAt}T00:00:00.000Z`);
  const overlapping = existing.some((s) => {
    const st = effectiveStatus(s, now);
    return (st === "active" || st === "scheduled") && Date.parse(s.endsAt) > start.getTime();
  });
  if (overlapping) throw new DomainError("Bu profilin çakışan aktif/planlanmış aboneliği var; yenileme kullanın");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + input.months);
  const sub = await repo.createSubscription({
    profileId: profile.id,
    planId: plan.id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    status: start > now ? "scheduled" : "active",
    autoRenew: input.autoRenew,
    sponsored: input.sponsored,
    externalRef: null,
    note: input.note,
  });
  await audit(actor, "subscription.create", "subscription", sub.id, { profileId: profile.id, plan: plan.code, months: input.months });
  return sub;
}

export async function renewSubscription(actor: Admin, id: string, months: number) {
  if (!Number.isInteger(months) || months < 1 || months > 24) throw new DomainError("Yenileme süresi 1 ile 24 ay arasında bir tam sayı olmalı");
  const repo = getRepository();
  const sub = await repo.getSubscription(id);
  if (!sub) throw new DomainError("Abonelik bulunamadı");
  if (sub.status === "cancelled") throw new DomainError("İptal edilmiş abonelik yenilenemez; yeni abonelik oluşturun");
  const now = new Date();
  const period = renewalPeriod(sub, months, now);
  const updated = await repo.updateSubscription(id, {
    endsAt: period.endsAt,
    status: effectiveStatus({ ...sub, endsAt: period.endsAt }, now) === "scheduled" ? "scheduled" : "active",
  });
  await audit(actor, "subscription.renew", "subscription", id, { months, endsAt: period.endsAt });
  return updated;
}

export async function cancelSubscription(actor: Admin, id: string, reason: string) {
  const repo = getRepository();
  const sub = await repo.getSubscription(id);
  if (!sub) throw new DomainError("Abonelik bulunamadı");
  if (!canCancel(sub, new Date())) throw new DomainError("Bu abonelik iptal edilemez");
  const updated = await repo.updateSubscription(id, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    autoRenew: false,
    sponsored: false,
  });
  await audit(actor, "subscription.cancel", "subscription", id, { reason });
  return updated;
}

/** Süresi dolanları "expired" olarak işaretler (zamanlanmış görev). */
export async function syncSubscriptionStatuses(now = new Date()): Promise<number> {
  const repo = getRepository();
  let changed = 0;
  for (const s of await repo.listSubscriptions()) {
    const eff = effectiveStatus(s, now);
    if (eff !== s.status) {
      await repo.updateSubscription(s.id, { status: eff });
      changed++;
    }
  }
  return changed;
}
