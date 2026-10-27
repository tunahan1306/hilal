// Modül E — Moderasyon ve Güven (genelleştirme). moderation_reports/moderation_actions
// YERİNDE değiştirilir (bkz. 20261027000005_moderation_generalization.sql); mevcut,
// test edilmiş, canlı admin-küratörlü ürün akışı (src/server/services/moderation.ts)
// DOKUNULMADAN kalır — yalnızca `content_type = 'profile'` satırlarını üretmeye devam eder.
// Bu dosya yalnızca YENİ modüllerin (B/C) içeriği için genelleştirilmiş raporlama/triyaj'ı tanımlar.

export const MODERATION_CONTENT_TYPES = ["profile", "user_profile", "post", "message", "media_asset", "creator_account"] as const;
export type ModerationContentType = (typeof MODERATION_CONTENT_TYPES)[number];

export const MODERATION_CONTENT_TYPE_LABELS: Record<ModerationContentType, string> = {
  profile: "Profil (keşif ürünü)",
  user_profile: "Kullanıcı profili",
  post: "Gönderi",
  message: "Mesaj",
  media_asset: "Medya",
  creator_account: "Creator hesabı",
};

/** Yeni modüllerin içeriği bu tiplerden biriyle bildirilir — admin-küratörlü 'profile' burada asla üretilmez. */
export const REPORTABLE_CONTENT_TYPES = MODERATION_CONTENT_TYPES.filter((t) => t !== "profile") as Exclude<ModerationContentType, "profile">[];

export const CONTENT_TRIAGE_ACTIONS = ["dismiss", "warn", "remove_content", "suspend_account"] as const;
export type ContentTriageAction = (typeof CONTENT_TRIAGE_ACTIONS)[number];
