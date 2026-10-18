import { ageOn, isAdult } from "./age";
import { getProvinceByPlate, listDistricts } from "./locations";
import { isPubliclyDeliverable, orderMedia } from "./media";
import { activeConsent, isVerified } from "./publishing";
import { isSponsoredNow } from "./subscriptions";
import type {
  Interest,
  MembershipPlan,
  Profile,
  ProfileConsent,
  ProfileMedia,
  PublicProfile,
  Subscription,
  VerificationRecord,
} from "./types";

/**
 * Kamuya açıklık kuralı; veritabanındaki profiles_public görünümünün birebir karşılığıdır
 * (supabase/migrations/20261025000001_country_publication_gate.sql). Yayın anındaki
 * kontroller sonradan bozulursa (rıza geri çekme, doğrulama iptali, ülke onayının geri
 * alınması veya süresinin dolması) profil durum değişmeden kamuya kapanır.
 */
export function isPubliclyVisible(args: {
  profile: Profile;
  consents: ProfileConsent[];
  verifications: VerificationRecord[];
  countryPublishable: boolean;
  now: Date;
}): boolean {
  const { profile, consents, verifications, now } = args;
  return (
    profile.status === "published" &&
    Boolean(profile.publishedAt) &&
    profile.moderationStatus === "approved" &&
    isAdult(profile.birthDate, now) &&
    args.countryPublishable &&
    isVerified(verifications, "age") &&
    Boolean(activeConsent(consents, "publication")) &&
    Boolean(activeConsent(consents, "photo_rights"))
  );
}

/**
 * Yönetim verisinden kamuya açık profil görünümünü üretir. Doğum tarihi,
 * moderasyon notları, rıza belgeleri gibi alanlar asla dışarı taşınmaz.
 */
export function toPublicProfile(args: {
  profile: Profile;
  media: ProfileMedia[];
  interests: Interest[];
  verifications: VerificationRecord[];
  consents: ProfileConsent[];
  countryPublishable: boolean;
  /** Numara başka bir yayındaki profilde / örnek kayıtta da kullanılıyorsa gösterilmez. */
  phoneShared: boolean;
  subscription?: Subscription;
  plan?: MembershipPlan;
  now: Date;
}): PublicProfile | null {
  const { profile, now } = args;
  const province = getProvinceByPlate(profile.provincePlate);
  if (!province || !profile.publishedAt || !isPubliclyVisible(args)) return null;
  const district = profile.districtSlug
    ? listDistricts(province.plate).find((d) => d.slug === profile.districtSlug) ?? null
    : null;
  const deliverable = orderMedia(args.media.filter(isPubliclyDeliverable));
  return {
    id: profile.id,
    slug: profile.slug,
    nickname: profile.nickname,
    age: ageOn(profile.birthDate, now),
    province: { plate: province.plate, name: province.name, slug: province.slug, country: province.country },
    district: district ? { name: district.name, slug: district.slug } : null,
    bio: profile.bio,
    interests: args.interests
      .filter((i) => profile.interestIds.includes(i.id))
      .map((i) => ({ slug: i.slug, name: i.name })),
    whatsappPhone: profile.whatsappConsentAt && !args.phoneShared ? profile.whatsappPhone ?? null : null,
    verified: isVerified(args.verifications, "identity"),
    sponsored: isSponsoredNow(args.subscription, args.plan, now),
    bioDoc: profile.bioDoc,
    images: deliverable.filter((m) => m.kind === "image").map((m) => ({ url: m.publicUrl!, alt: m.alt, width: m.width, height: m.height })),
    videos: deliverable
      .filter((m) => m.kind === "video")
      .map((m) => ({ url: m.publicUrl!, posterUrl: m.publicPosterUrl, alt: m.alt, width: m.width, height: m.height, durationSeconds: m.durationSeconds, mimeType: m.mimeType })),
    publishedAt: profile.publishedAt,
    updatedAt: profile.updatedAt,
    seo: { title: profile.seoTitle, description: profile.seoDescription, noindex: profile.noindex },
  };
}
