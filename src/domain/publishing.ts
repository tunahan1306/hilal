import { isAdult } from "./age";
import { hasBlockingFindings, scanProfileContent, type PolicyFinding } from "./content-policy";
import { linksOf } from "./rich-text";

function hostOf(href: string): string {
  try {
    return new URL(href).hostname.toLowerCase();
  } catch {
    return "";
  }
}
import {
  CRITICAL_REPORT_CATEGORIES,
  type ModerationReport,
  type Profile,
  type ProfileConsent,
  type ProfileMedia,
  type ProfileStatus,
  type VerificationRecord,
} from "./types";

export type PublishCheckId =
  | "age_verified"
  | "adult"
  | "publication_consent"
  | "photo_rights_consent"
  | "approved_cover"
  | "moderation_approved"
  | "content_policy"
  | "no_critical_reports"
  | "location"
  | "country_permitted"
  | "contact_unique";

export type PublishCheck = { id: PublishCheckId; label: string; passed: boolean; detail?: string };

export type PublishReadiness = {
  ready: boolean;
  checks: PublishCheck[];
  findings: PolicyFinding[];
};

export type PublishContext = {
  profile: Profile;
  consents: ProfileConsent[];
  verifications: VerificationRecord[];
  media: ProfileMedia[];
  reports: ModerationReport[];
  interestNames: string[];
  now: Date;
  /** Profilin ülkesi şu anda yayına açık mı (kayıtlı hukuki karar + geçerli gözden geçirme tarihi)? */
  countryPublishable: boolean;
  /** WhatsApp numarası başka bir yayındaki profilde kullanılıyor mu? (bir numara = bir profil) */
  phoneInUseElsewhere?: boolean;
  /** Biyografide yayınlanabilecek harici bağlantı alan adları (varsayılan: hiçbiri) */
  linkAllowlist?: string[];
};

export function activeConsent(consents: ProfileConsent[], type: ProfileConsent["type"]): ProfileConsent | undefined {
  return consents.find((c) => c.type === type && c.revokedAt === null);
}

export function isVerified(verifications: VerificationRecord[], type: VerificationRecord["type"]): boolean {
  return verifications.some((v) => v.type === type && v.status === "approved");
}

export function hasOpenCriticalReport(reports: ModerationReport[]): boolean {
  return reports.some(
    (r) => CRITICAL_REPORT_CATEGORIES.includes(r.category) && (r.status === "open" || r.status === "in_review"),
  );
}

/**
 * Yayın ön koşulları. Bu fonksiyon hem UI'daki kontrol listesini hem de sunucu
 * tarafındaki yayın engelini besler: tek doğruluk kaynağıdır.
 */
export function evaluatePublishReadiness(ctx: PublishContext): PublishReadiness {
  const { profile, consents, verifications, media, reports, now } = ctx;
  const allow = new Set((ctx.linkAllowlist ?? []).map((h) => h.toLowerCase()));
  const links = profile.bioDoc ? linksOf(profile.bioDoc) : [];
  // Site içi ve izin listesindeki bağlantılar taramaya girmez; diğer tüm harici bağlantılar "Harici bağlantı" bulgusu üretir.
  const flaggedLinks = links.filter((h) => !h.startsWith("/") && !allow.has(hostOf(h)));
  const findings = scanProfileContent({
    nickname: profile.nickname,
    bio: profile.bio,
    extra: [...media.map((i) => i.alt), ...ctx.interestNames, ...flaggedLinks],
  });
  const approvedImages = media.filter((m) => m.kind === "image" && m.status === "ready" && m.rightsConfirmed && m.moderation === "approved");

  const checks: PublishCheck[] = [
    {
      id: "age_verified",
      label: "Yaş doğrulaması onaylandı",
      passed: isVerified(verifications, "age"),
    },
    {
      id: "adult",
      label: "Profil sahibi 18 yaşından büyük",
      passed: isAdult(profile.birthDate, now),
    },
    {
      id: "publication_consent",
      label: "Açık yayın yetkilendirmesi mevcut",
      passed: Boolean(activeConsent(consents, "publication")),
    },
    {
      id: "photo_rights_consent",
      label: "Fotoğraf kullanım izni mevcut",
      passed: Boolean(activeConsent(consents, "photo_rights")),
    },
    {
      id: "approved_cover",
      label: "En az bir fotoğrafın kullanım hakkı kayıtlı ve yayını onaylı",
      passed: approvedImages.length > 0,
      detail: media.length && !approvedImages.length
        ? `${media.filter((m) => m.moderation === "pending").length} medya onay bekliyor`
        : media.some((m) => m.moderation === "pending")
          ? `${media.filter((m) => m.moderation === "pending").length} medya onay bekliyor (yayında görünmez)`
          : undefined,
    },
    {
      id: "moderation_approved",
      label: "Moderasyon kontrolü tamamlandı",
      passed: profile.moderationStatus === "approved",
    },
    {
      id: "content_policy",
      label: "İçerik politikasına uygun (yasaklı hizmet / iletişim bilgisi yok)",
      passed: !hasBlockingFindings(findings),
      detail: findings
        .filter((f) => f.severity === "block")
        .map((f) => f.message)
        .join(", ") || undefined,
    },
    {
      id: "no_critical_reports",
      label: "Açık kritik şikâyet yok",
      passed: !hasOpenCriticalReport(reports),
    },
    {
      id: "location",
      label: "İl bilgisi girildi",
      passed: profile.provincePlate > 0,
    },
    {
      id: "country_permitted",
      label: "Profilin ülkesi yayına açık (kayıtlı ülke kararı)",
      passed: ctx.countryPublishable,
      detail: ctx.countryPublishable ? undefined : "Bu ülke için geçerli bir yayın kararı yok (Yönetim → Ülkeler)",
    },
    {
      id: "contact_unique",
      label: "WhatsApp numarası başka bir yayındaki profilde kullanılmıyor",
      passed: !ctx.phoneInUseElsewhere,
    },
  ];

  return { ready: checks.every((c) => c.passed), checks, findings };
}

/** İzin verilen durum geçişleri. */
const TRANSITIONS: Record<ProfileStatus, ProfileStatus[]> = {
  draft: ["in_review", "published", "archived"],
  in_review: ["draft", "published", "archived"],
  published: ["unpublished", "archived"],
  unpublished: ["in_review", "published", "archived", "draft"],
  archived: ["draft"],
};

export function canTransition(from: ProfileStatus, to: ProfileStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayında",
  unpublished: "Yayından kaldırıldı",
  archived: "Arşivlendi",
};
