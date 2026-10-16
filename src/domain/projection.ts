import { ageOn } from "./age";
import { getProvinceByPlate, listDistricts } from "./locations";
import { isPubliclyDeliverable, orderMedia } from "./media";
import { isVerified } from "./publishing";
import { isSponsoredNow } from "./subscriptions";
import type {
  Interest,
  MembershipPlan,
  Profile,
  ProfileMedia,
  PublicProfile,
  Subscription,
  VerificationRecord,
} from "./types";

/**
 * Yönetim verisinden kamuya açık profil görünümünü üretir. Doğum tarihi,
 * moderasyon notları, rıza belgeleri gibi alanlar asla dışarı taşınmaz.
 */
export function toPublicProfile(args: {
  profile: Profile;
  media: ProfileMedia[];
  interests: Interest[];
  verifications: VerificationRecord[];
  subscription?: Subscription;
  plan?: MembershipPlan;
  now: Date;
}): PublicProfile | null {
  const { profile, now } = args;
  const province = getProvinceByPlate(profile.provincePlate);
  if (!province || profile.status !== "published" || !profile.publishedAt) return null;
  const district = profile.districtSlug
    ? listDistricts(province.plate).find((d) => d.slug === profile.districtSlug) ?? null
    : null;
  const deliverable = orderMedia(args.media.filter(isPubliclyDeliverable));
  return {
    id: profile.id,
    slug: profile.slug,
    nickname: profile.nickname,
    age: ageOn(profile.birthDate, now),
    province: { plate: province.plate, name: province.name, slug: province.slug },
    district: district ? { name: district.name, slug: district.slug } : null,
    bio: profile.bio,
    interests: args.interests
      .filter((i) => profile.interestIds.includes(i.id))
      .map((i) => ({ slug: i.slug, name: i.name })),
    whatsappPhone: profile.whatsappConsentAt ? profile.whatsappPhone ?? null : null,
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
