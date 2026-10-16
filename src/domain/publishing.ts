import { isAdult } from "./age";
import { hasBlockingFindings, scanProfileContent, type PolicyFinding } from "./content-policy";
import {
  CRITICAL_REPORT_CATEGORIES,
  type ModerationReport,
  type Profile,
  type ProfileConsent,
  type ProfileImage,
  type ProfileStatus,
  type VerificationRecord,
} from "./types";

export type PublishCheckId =
  | "age_verified"
  | "adult"
  | "publication_consent"
  | "photo_rights_consent"
  | "images_present"
  | "images_rights_confirmed"
  | "moderation_approved"
  | "content_policy"
  | "no_critical_reports"
  | "location";

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
  images: ProfileImage[];
  reports: ModerationReport[];
  interestNames: string[];
  now: Date;
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
  const { profile, consents, verifications, images, reports, now } = ctx;
  const findings = scanProfileContent({
    nickname: profile.nickname,
    bio: profile.bio,
    extra: [...images.map((i) => i.alt), ...ctx.interestNames],
  });

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
      id: "images_present",
      label: "En az bir fotoğraf yüklendi",
      passed: images.length > 0,
    },
    {
      id: "images_rights_confirmed",
      label: "Tüm fotoğrafların kullanım hakkı doğrulandı",
      passed: images.length > 0 && images.every((i) => i.rightsConfirmed),
      detail: images.filter((i) => !i.rightsConfirmed).length
        ? `${images.filter((i) => !i.rightsConfirmed).length} fotoğraf doğrulanmadı`
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
