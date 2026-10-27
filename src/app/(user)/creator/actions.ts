"use server";

import { z } from "zod";
import { assertUser } from "@/server/auth/user-session";
import { DomainError } from "@/server/services/errors";
import { logError } from "@/server/log";
import { PaymentsDisabledError } from "@/server/payments";
import {
  applyCreatorAccount,
  createSubscriptionTier,
  recordContentRights,
  subscribeToTier,
} from "@/server/services/creator";

export type CreatorState = { message: string } | null;

async function run(fn: () => Promise<void | string>): Promise<CreatorState> {
  try {
    const message = await fn();
    return message ? { message } : null;
  } catch (e) {
    if (e instanceof z.ZodError) return { message: e.issues[0]?.message ?? "Formdaki bilgileri kontrol edin." };
    if (e instanceof PaymentsDisabledError) return { message: e.message };
    if (e instanceof DomainError) return { message: e.message };
    logError("creator.action", e);
    return { message: "Beklenmeyen bir hata oluştu." };
  }
}

export async function applyCreatorAccountAction(_prev: CreatorState, formData: FormData): Promise<CreatorState> {
  return run(async () => {
    const actor = await assertUser();
    await applyCreatorAccount(actor, { legalName: String(formData.get("legalName") ?? ""), countryCode: String(formData.get("countryCode") ?? "") as "tr" });
    return "Başvurunuz alındı; admin onayı bekleniyor.";
  });
}

export async function recordContentRightsAction(_prev: CreatorState, formData: FormData): Promise<CreatorState> {
  return run(async () => {
    const actor = await assertUser();
    await recordContentRights(actor, { mediaAssetId: String(formData.get("mediaAssetId") ?? ""), rightsType: String(formData.get("rightsType") ?? "self_generated") as "self_generated" });
    return "Hak beyanı kaydedildi; admin incelemesi bekleniyor.";
  });
}

export async function createSubscriptionTierAction(_prev: CreatorState, formData: FormData): Promise<CreatorState> {
  return run(async () => {
    const actor = await assertUser();
    await createSubscriptionTier(actor, {
      name: String(formData.get("name") ?? ""),
      priceAmount: Number(formData.get("priceAmount") ?? 0),
      priceCurrency: String(formData.get("priceCurrency") ?? "try"),
      description: String(formData.get("description") ?? "") || undefined,
    });
    return "Abonelik planı oluşturuldu.";
  });
}

/** Abonelik satın alma girişimi — bkz. subscribeToTier yorumu: bugün her zaman devre dışı hatası döner. */
export async function subscribeAction(_prev: CreatorState, formData: FormData): Promise<CreatorState> {
  return run(async () => {
    const actor = await assertUser();
    await subscribeToTier(actor, { tierId: String(formData.get("tierId") ?? "") });
    return "Abone olundu.";
  });
}
