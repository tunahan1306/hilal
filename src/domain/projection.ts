import { ageOn } from "./age";
import { getProvinceByPlate, listDistricts } from "./locations";
import { isVerified } from "./publishing";
import { isSponsoredNow } from "./subscriptions";
import type {
  Interest,
  MembershipPlan,
  Profile,
  ProfileImage,
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
  images: ProfileImage[];
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
  const maxPhotos = args.plan?.maxPhotos ?? 3;
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
    verified: isVerified(args.verifications, "identity"),
    sponsored: isSponsoredNow(args.subscription, args.plan, now),
    images: args.images
      .filter((i) => i.rightsConfirmed)
      .sort((a, b) => a.position - b.position)
      .slice(0, maxPhotos)
      .map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
    publishedAt: profile.publishedAt,
    updatedAt: profile.updatedAt,
    seo: { title: profile.seoTitle, description: profile.seoDescription, noindex: profile.noindex },
  };
}
