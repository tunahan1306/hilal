import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COUNTRY_CODES, countryOfPlate, isCountry, plateRange, type CountryCode } from "@/domain/countries";
import { defaultPolicies, PUBLICATION_STATUSES, type CountryDecision, type CountryPolicy, type PublicationStatus } from "@/domain/country-policy";
import { defaultFeaturePolicies, FEATURE_POLICY_STATUSES, POLICY_FEATURES, type CountryFeatureDecision, type CountryFeaturePolicy, type FeaturePolicyStatus, type PolicyFeature } from "@/domain/policy";
import type { AgeVerificationCheck, AgeVerificationStatus, AppUser, AppUserStatus, ConsentRecord, ConsentRecordType, UserRole } from "@/domain/identity";
import type { Conversation, MediaAsset, Message, Notification, Post, ProfileVisibility, PublicPost, PublicUserProfile, UserBlock, UserProfile } from "@/domain/social";
import type {
  ContentRights,
  CreatorAccount,
  CreatorAccountStatus,
  CreatorPayout,
  CreatorSubscription,
  CreatorSubscriptionTier,
} from "@/domain/creator";
import { sideDistricts } from "@/domain/istanbul";
import { effectiveStatus, isExpiringSoon } from "@/domain/subscriptions";
import type {
  Admin,
  AuditLog,
  Interest,
  MembershipPlan,
  ModerationAction,
  ModerationReport,
  ContactMessage,
  PrivacyRequest,
  Profile,
  ProfileConsent,
  ProfileImage,
  PublicProfile,
  SeoPage,
  SiteSettings,
  Subscription,
  VerificationRecord,
} from "@/domain/types";
import type { DashboardCounts, Repository } from "./types";

/**
 * Supabase repository.
 *
 * - Kamuya açık okumalar anon anahtarıyla, yalnızca *_public view'ları üzerinden
 *   yapılır (RLS + view kolon kısıtı).
 * - Yönetim işlemleri service role ile yapılır; bu fonksiyonlar yalnızca
 *   `requireAdmin()` kontrolünden geçen Server Action'lardan çağrılır.
 */

type Row = Record<string, unknown>;


function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} tanımlı değil`);
  return v;
}

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function anon(): SupabaseClient {
  anonClient ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

function service(): SupabaseClient {
  serviceClient ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** Veritabanı hatası: yalnızca kod ve mesaj taşınır; `details`/`hint` (satır değerleri içerebilir) atılır. */
export class DbError extends Error {
  constructor(message: string, readonly code: string | undefined) {
    super(message);
    this.name = "DbError";
  }
}

/** Tablo/ilişki yok: migration uygulanmamış. */
export const isMissingRelation = (e: unknown) => e instanceof DbError && (e.code === "PGRST205" || e.code === "42P01");

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new DbError(res.error.message, res.error.code);
  return res.data;
}

// ---------------------------------------------------------------------------
// Konum id eşlemesi (plaka/slug <-> uuid)
// ---------------------------------------------------------------------------
type LocationIndex = {
  cityIdByPlate: Map<number, string>;
  plateByCityId: Map<string, number>;
  districtId: Map<string, string>; // `${plate}|${slug}` -> id
  districtSlugById: Map<string, string>;
};
let locationIndex: Promise<LocationIndex> | null = null;

function locations(): Promise<LocationIndex> {
  locationIndex ??= (async () => {
    const cities = check(await anon().from("cities").select("id, plate")) as { id: string; plate: number }[];
    const districts: { id: string; city_id: string; slug: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const page = check(
        await anon().from("districts").select("id, city_id, slug").range(from, from + 999),
      ) as typeof districts;
      districts.push(...page);
      if (page.length < 1000) break;
    }
    const idx: LocationIndex = {
      cityIdByPlate: new Map(cities.map((c) => [c.plate, c.id])),
      plateByCityId: new Map(cities.map((c) => [c.id, c.plate])),
      districtId: new Map(),
      districtSlugById: new Map(),
    };
    for (const d of districts) {
      const plate = idx.plateByCityId.get(d.city_id);
      idx.districtId.set(`${plate}|${d.slug}`, d.id);
      idx.districtSlugById.set(d.id, d.slug);
    }
    return idx;
  })().catch((e) => {
    locationIndex = null;
    throw e;
  });
  return locationIndex;
}

// ---------------------------------------------------------------------------
// Satır eşleyiciler
// ---------------------------------------------------------------------------
async function toProfile(r: Row, interestIds: string[]): Promise<Profile> {
  const loc = await locations();
  return {
    id: r.id as string,
    slug: r.slug as string,
    nickname: r.nickname as string,
    whatsappPhone: (r.whatsapp_phone as string) ?? null,
    whatsappConsentAt: (r.whatsapp_consent_at as string) ?? null,
    birthDate: r.birth_date as string,
    provincePlate: loc.plateByCityId.get(r.city_id as string) ?? 0,
    districtSlug: r.district_id ? (loc.districtSlugById.get(r.district_id as string) ?? null) : null,
    bio: r.bio as string,
    bioDoc: (r.bio_doc as Profile["bioDoc"]) ?? null,
    interestIds,
    status: r.status as Profile["status"],
    moderationStatus: r.moderation_status as Profile["moderationStatus"],
    moderationNote: (r.moderation_note as string) ?? null,
    moderatedBy: (r.moderated_by as string) ?? null,
    moderatedAt: (r.moderated_at as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    archivedAt: (r.archived_at as string) ?? null,
    seoTitle: (r.seo_title as string) ?? null,
    seoDescription: (r.seo_description as string) ?? null,
    noindex: Boolean(r.noindex),
    createdBy: (r.created_by as string) ?? "",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

async function profileColumns(p: Partial<Profile>): Promise<Row> {
  const loc = await locations();
  const row: Row = {};
  const map: [keyof Profile, string][] = [
    ["whatsappPhone", "whatsapp_phone"], ["whatsappConsentAt", "whatsapp_consent_at"], ["slug", "slug"], ["nickname", "nickname"], ["birthDate", "birth_date"], ["bio", "bio"], ["status", "status"],
    ["moderationStatus", "moderation_status"], ["moderationNote", "moderation_note"], ["moderatedBy", "moderated_by"],
    ["moderatedAt", "moderated_at"], ["publishedAt", "published_at"], ["archivedAt", "archived_at"],
    ["bioDoc", "bio_doc"], ["seoTitle", "seo_title"], ["seoDescription", "seo_description"], ["noindex", "noindex"], ["createdBy", "created_by"],
  ];
  for (const [k, col] of map) if (k in p) row[col] = p[k];
  if (p.provincePlate !== undefined) {
    const cityId = loc.cityIdByPlate.get(p.provincePlate);
    if (!cityId) throw new Error("Geçersiz il");
    row.city_id = cityId;
  }
  if ("districtSlug" in p) {
    const plate = p.provincePlate;
    row.district_id = p.districtSlug && plate ? (loc.districtId.get(`${plate}|${p.districtSlug}`) ?? null) : null;
  }
  return row;
}

const mediaColumns = {"id": "id", "profileId": "profile_id", "kind": "kind", "status": "status", "storagePath": "storage_path", "thumbPath": "thumb_path", "publicUrl": "public_url", "publicPosterUrl": "public_poster_url", "publicPaths": "public_paths", "mimeType": "mime_type", "bytes": "bytes", "width": "width", "height": "height", "durationSeconds": "duration_seconds", "alt": "alt", "position": "position", "isCover": "is_cover", "rightsConfirmed": "rights_confirmed", "ownershipSource": "ownership_source", "ownershipNote": "ownership_note", "rightsConfirmedBy": "rights_confirmed_by", "rightsConfirmedAt": "rights_confirmed_at", "moderation": "moderation", "moderatedBy": "moderated_by", "moderatedAt": "moderated_at", "sha256": "sha256", "dhash": "dhash", "failureReason": "failure_reason", "createdAt": "created_at"} as const;
const toImage = (r: Row): ProfileImage => Object.fromEntries(Object.entries(mediaColumns).map(([key, column]) => [key, r[column]])) as ProfileImage;
function mediaRow(input: Partial<ProfileImage>): Row {
  return Object.fromEntries(Object.entries(mediaColumns).filter(([key]) => key in input).map(([key, column]) => [column, input[key as keyof ProfileImage]]));
}

const toConsent = (r: Row): ProfileConsent => ({
  id: r.id as string,
  profileId: r.profile_id as string,
  type: r.type as ProfileConsent["type"],
  grantedAt: r.granted_at as string,
  revokedAt: (r.revoked_at as string) ?? null,
  evidencePath: (r.evidence_path as string) ?? null,
  method: r.method as string,
  recordedBy: (r.recorded_by as string) ?? "",
});

const toVerification = (r: Row): VerificationRecord => ({
  id: r.id as string,
  profileId: r.profile_id as string,
  type: r.type as VerificationRecord["type"],
  status: r.status as VerificationRecord["status"],
  method: r.method as string,
  documentPath: (r.document_path as string) ?? null,
  checkedBy: (r.checked_by as string) ?? null,
  checkedAt: (r.checked_at as string) ?? null,
  retainUntil: (r.retain_until as string) ?? null,
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

const toReport = (r: Row): ModerationReport => ({
  id: r.id as string,
  profileId: (r.profile_id as string) ?? null,
  contentType: r.content_type as ModerationReport["contentType"],
  contentId: r.content_id as string,
  category: r.category as ModerationReport["category"],
  description: r.description as string,
  reporterEmail: (r.reporter_email as string) ?? null,
  status: r.status as ModerationReport["status"],
  resolution: (r.resolution as string) ?? null,
  reporterHash: r.reporter_hash as string,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toAction = (r: Row): ModerationAction => ({
  id: r.id as string,
  reportId: (r.report_id as string) ?? null,
  profileId: (r.profile_id as string) ?? null,
  contentType: r.content_type as ModerationAction["contentType"],
  contentId: r.content_id as string,
  type: r.type as ModerationAction["type"],
  note: (r.note as string) ?? null,
  actorId: (r.actor_id as string) ?? null,
  createdAt: r.created_at as string,
});

const toPlan = (r: Row): MembershipPlan => ({
  id: r.id as string,
  code: r.code as MembershipPlan["code"],
  name: r.name as string,
  description: r.description as string,
  storageQuotaMb: r.storage_quota_mb as number,
  sponsoredEligible: Boolean(r.sponsored_eligible),
  advancedStats: Boolean(r.advanced_stats),
  customization: Boolean(r.customization),
  priceMonthlyTry: Number(r.price_monthly_try),
  active: Boolean(r.active),
});

const toSubscription = (r: Row): Subscription => ({
  id: r.id as string,
  profileId: r.profile_id as string,
  planId: r.plan_id as string,
  startsAt: r.starts_at as string,
  endsAt: r.ends_at as string,
  status: r.status as Subscription["status"],
  autoRenew: Boolean(r.auto_renew),
  sponsored: Boolean(r.sponsored),
  cancelledAt: (r.cancelled_at as string) ?? null,
  externalRef: (r.external_ref as string) ?? null,
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

const toPrivacy = (r: Row): PrivacyRequest => ({
  id: r.id as string,
  type: r.type as PrivacyRequest["type"],
  profileId: (r.profile_id as string) ?? null,
  profileUrl: (r.profile_url as string) ?? null,
  requesterName: r.requester_name as string,
  requesterEmail: r.requester_email as string,
  relation: r.relation as PrivacyRequest["relation"],
  details: r.details as string,
  status: r.status as PrivacyRequest["status"],
  dueAt: r.due_at as string,
  completedAt: (r.completed_at as string) ?? null,
  createdAt: r.created_at as string,
});

const toContact = (r: Row): ContactMessage => ({
  id: r.id as string,
  category: r.category as ContactMessage["category"],
  name: r.name as string,
  email: r.email as string,
  subject: r.subject as string,
  message: r.message as string,
  status: r.status as ContactMessage["status"],
  readAt: (r.read_at as string) ?? null,
  ipHash: r.ip_hash as string,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toSeo = (r: Row): SeoPage => ({
  id: r.id as string,
  path: r.path as string,
  title: (r.title as string) ?? null,
  description: (r.description as string) ?? null,
  canonical: (r.canonical as string) ?? null,
  indexOverride: (r.index_override as boolean | null) ?? null,
  intro: (r.intro as string) ?? null,
  updatedAt: r.updated_at as string,
});

const toAdmin = (r: Row): Admin => ({
  id: r.id as string,
  email: r.email as string,
  displayName: r.display_name as string,
  role: r.role as Admin["role"],
  mfaEnrolled: true,
  createdAt: r.created_at as string,
});

// ---------------------------------------------------------------------------
// Kamuya açık profil derleme
// ---------------------------------------------------------------------------
async function hydratePublic(rows: Row[]): Promise<PublicProfile[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id as string);
  const [images, interests] = await Promise.all([
    anon().from("profile_media_public").select("*").in("profile_id", ids).order("position"),
    anon().from("profile_interests_public").select("*").in("profile_id", ids),
  ]);
  const imgRows = check(images) as Row[];
  const intRows = check(interests) as Row[];
  return rows.map((r) => {
    return {
      id: r.id as string,
      slug: r.slug as string,
      nickname: r.nickname as string,
      isExample: Boolean(r.is_example),
      // Kurgusal kayıt iletişim numarası taşımaz (görünüm de null döndürür; ikinci savunma hattı).
      whatsappPhone: r.is_example ? null : ((r.whatsapp_phone as string) ?? null),
      age: r.age as number,
      province: {
        plate: r.city_plate as number,
        name: (r.city_name as string) ?? "",
        slug: r.city_slug as string,
        country: countryOfPlate(r.city_plate as number),
      },
      district: r.district_slug ? { name: r.district_name as string, slug: r.district_slug as string } : null,
      bio: r.bio as string,
    bioDoc: (r.bio_doc as Profile["bioDoc"]) ?? null,
      interests: intRows
        .filter((i) => i.profile_id === r.id)
        .map((i) => ({ slug: i.slug as string, name: i.name as string })),
      verified: Boolean(r.verified),
      sponsored: Boolean(r.sponsored),
      images: r.is_example && r.example_image_url ? [{ url: String(r.example_image_url), alt: `${r.nickname} profil görseli`, width: Number(r.example_image_width), height: Number(r.example_image_height) }] : imgRows
        .filter((i) => i.profile_id === r.id && i.kind === "image")
        .map((i) => ({ url: i.url as string, alt: i.alt as string, width: i.width as number, height: i.height as number })),
      videos: imgRows.filter((i) => i.profile_id === r.id && i.kind === "video").map((i) => ({ url: i.url as string, posterUrl: i.poster_url as string | null, alt: i.alt as string, width: i.width as number, height: i.height as number, mimeType: i.mime_type as string, durationSeconds: i.duration_seconds as number | null })),
      publishedAt: r.published_at as string,
      updatedAt: r.updated_at as string,
      seo: {
        title: (r.seo_title as string) ?? null,
        description: (r.seo_description as string) ?? null,
        noindex: Boolean(r.noindex),
      },
    };
  });
}

async function interestIdsFor(profileIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!profileIds.length) return out;
  const rows = check(
    await service().from("profile_interests").select("profile_id, interest_id").in("profile_id", profileIds),
  ) as Row[];
  for (const r of rows) {
    const list = out.get(r.profile_id as string) ?? [];
    list.push(r.interest_id as string);
    out.set(r.profile_id as string, list);
  }
  return out;
}

async function setInterests(profileId: string, interestIds: string[]): Promise<void> {
  check(await service().from("profile_interests").delete().eq("profile_id", profileId));
  if (interestIds.length) {
    check(
      await service()
        .from("profile_interests")
        .insert(interestIds.map((interest_id) => ({ profile_id: profileId, interest_id }))),
    );
  }
}

function toDecision(r: Row): CountryDecision {
  return {
    id: String(r.id),
    countryCode: String(r.country_code) as CountryCode,
    status: String(r.status) as PublicationStatus,
    approverName: String(r.approver_name),
    evidenceRef: r.evidence_ref === null ? null : String(r.evidence_ref),
    reviewDue: r.review_due === null ? null : String(r.review_due),
    restrictions: r.restrictions === null ? null : String(r.restrictions),
    note: r.note === null ? null : String(r.note),
    decidedBy: String(r.decided_by),
    decidedAt: String(r.decided_at),
  };
}

function toFeatureDecision(r: Row): CountryFeatureDecision {
  return {
    id: String(r.id),
    countryCode: String(r.country_code) as CountryCode,
    feature: String(r.feature_code) as PolicyFeature,
    status: String(r.status) as FeaturePolicyStatus,
    approverName: String(r.approver_name),
    evidenceRef: r.evidence_ref === null ? null : String(r.evidence_ref),
    reviewDue: r.review_due === null ? null : String(r.review_due),
    restrictions: r.restrictions === null ? null : String(r.restrictions),
    note: r.note === null ? null : String(r.note),
    decidedBy: String(r.decided_by),
    decidedAt: String(r.decided_at),
  };
}

function toAppUser(r: Row): AppUser {
  return {
    id: String(r.id),
    email: String(r.email),
    emailVerifiedAt: r.email_verified_at === null ? null : String(r.email_verified_at),
    status: String(r.status) as AppUserStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function toConsentRecord(r: Row): ConsentRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type) as ConsentRecordType,
    grantedAt: String(r.granted_at),
    revokedAt: r.revoked_at === null ? null : String(r.revoked_at),
    method: String(r.method),
    evidenceRef: r.evidence_ref === null ? null : String(r.evidence_ref),
    createdAt: String(r.created_at),
  };
}

function toAgeVerificationCheck(r: Row): AgeVerificationCheck {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    provider: String(r.provider),
    providerRef: String(r.provider_ref),
    status: String(r.status) as AgeVerificationStatus,
    checkedAt: r.checked_at === null ? null : String(r.checked_at),
    expiresAt: r.expires_at === null ? null : String(r.expires_at),
    note: r.note === null ? null : String(r.note),
    createdAt: String(r.created_at),
  };
}

function toUserProfile(r: Row): UserProfile {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    handle: String(r.handle),
    displayName: String(r.display_name),
    bio: r.bio === null ? null : String(r.bio),
    birthDate: String(r.birth_date),
    countryCode: String(r.country_code),
    visibility: String(r.visibility) as ProfileVisibility,
    moderationStatus: String(r.moderation_status) as UserProfile["moderationStatus"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function toPublicUserProfile(r: Row): PublicUserProfile {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    handle: String(r.handle),
    displayName: String(r.display_name),
    bio: r.bio === null ? null : String(r.bio),
    age: Number(r.age),
    countryCode: String(r.country_code),
    createdAt: String(r.created_at),
  };
}

function toMessage(r: Row): Message {
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    senderId: String(r.sender_id),
    body: String(r.body),
    createdAt: String(r.created_at),
    deletedAt: r.deleted_at === null ? null : String(r.deleted_at),
    moderationStatus: String(r.moderation_status) as Message["moderationStatus"],
  };
}

function toNotification(r: Row): Notification {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type) as Notification["type"],
    payload: (r.payload ?? {}) as Record<string, unknown>,
    readAt: r.read_at === null ? null : String(r.read_at),
    createdAt: String(r.created_at),
  };
}

function toMediaAsset(r: Row): MediaAsset {
  return {
    id: String(r.id),
    ownerId: String(r.owner_id),
    storagePath: String(r.storage_path),
    url: String(r.url),
    kind: String(r.kind) as MediaAsset["kind"],
    width: r.width === null ? null : Number(r.width),
    height: r.height === null ? null : Number(r.height),
    durationSeconds: r.duration_seconds === null ? null : Number(r.duration_seconds),
    status: String(r.status) as MediaAsset["status"],
    rightsConfirmed: Boolean(r.rights_confirmed),
    moderationStatus: String(r.moderation_status) as MediaAsset["moderationStatus"],
    createdAt: String(r.created_at),
  };
}

function toPost(r: Row): Post {
  return {
    id: String(r.id),
    authorId: String(r.author_id),
    body: String(r.body),
    visibility: String(r.visibility) as ProfileVisibility,
    paid: Boolean(r.paid),
    moderationStatus: String(r.moderation_status) as Post["moderationStatus"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function toPublicPost(r: Row): PublicPost {
  return { id: String(r.id), authorId: String(r.author_id), body: String(r.body), paid: Boolean(r.paid), createdAt: String(r.created_at) };
}

function toCreatorAccount(r: Row): CreatorAccount {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    legalName: String(r.legal_name),
    countryCode: String(r.country_code),
    status: String(r.status) as CreatorAccountStatus,
    approvedBy: r.approved_by === null ? null : String(r.approved_by),
    approvedAt: r.approved_at === null ? null : String(r.approved_at),
    createdAt: String(r.created_at),
  };
}

function toContentRights(r: Row): ContentRights {
  return {
    id: String(r.id),
    mediaAssetId: String(r.media_asset_id),
    rightsType: String(r.rights_type) as ContentRights["rightsType"],
    evidencePath: r.evidence_path === null ? null : String(r.evidence_path),
    confirmedAt: String(r.confirmed_at),
    reviewedBy: r.reviewed_by === null ? null : String(r.reviewed_by),
    reviewedAt: r.reviewed_at === null ? null : String(r.reviewed_at),
  };
}

function toSubscriptionTier(r: Row): CreatorSubscriptionTier {
  return {
    id: String(r.id),
    creatorId: String(r.creator_id),
    name: String(r.name),
    priceAmount: Number(r.price_amount),
    priceCurrency: String(r.price_currency),
    description: r.description === null ? null : String(r.description),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
  };
}

function toCreatorSubscription(r: Row): CreatorSubscription {
  return {
    id: String(r.id),
    subscriberId: String(r.subscriber_id),
    tierId: String(r.tier_id),
    status: String(r.status) as CreatorSubscription["status"],
    startsAt: String(r.starts_at),
    endsAt: String(r.ends_at),
    autoRenew: Boolean(r.auto_renew),
    externalRef: r.external_ref === null ? null : String(r.external_ref),
    createdAt: String(r.created_at),
  };
}

function toCreatorPayout(r: Row): CreatorPayout {
  return {
    id: String(r.id),
    creatorId: String(r.creator_id),
    periodStart: String(r.period_start),
    periodEnd: String(r.period_end),
    grossAmount: Number(r.gross_amount),
    platformFeeAmount: Number(r.platform_fee_amount),
    netAmount: Number(r.net_amount),
    status: String(r.status) as CreatorPayout["status"],
    externalRef: r.external_ref === null ? null : String(r.external_ref),
    createdAt: String(r.created_at),
  };
}

export function createSupabaseRepository(): Repository {
  return {
    kind: "supabase",
    async listCountryPolicies(): Promise<CountryPolicy[]> {
      const rows = check(await anon().from("countries").select("code, publication_status, review_due, decision_id")) as Row[];
      return defaultPolicies().map((base) => {
        const r = rows.find((x) => x.code === base.code);
        const status = String(r?.publication_status);
        if (!r || !(PUBLICATION_STATUSES as readonly string[]).includes(status)) return base;
        return { code: base.code, status: status as PublicationStatus, reviewDue: r.review_due === null ? null : String(r.review_due), decisionId: r.decision_id === null ? null : String(r.decision_id) };
      });
    },
    async listCountryDecisions(country) {
      let q = service().from("country_publication_decisions").select("*").order("decided_at", { ascending: false }).limit(200);
      if (country) q = q.eq("country_code", country);
      return (check(await q) as Row[]).map(toDecision).filter((d) => isCountry(d.countryCode) && COUNTRY_CODES.includes(d.countryCode));
    },
    async addCountryDecision(input) {
      const row = check(await service().from("country_publication_decisions").insert({
        country_code: input.countryCode,
        status: input.status,
        approver_name: input.approverName,
        evidence_ref: input.evidenceRef,
        review_due: input.reviewDue,
        restrictions: input.restrictions,
        note: input.note,
        decided_by: input.decidedBy,
      }).select("*").single()) as Row;
      return toDecision(row);
    },
    async listCountryFeaturePolicies(): Promise<CountryFeaturePolicy[]> {
      const rows = check(await anon().from("country_feature_policies").select("country_code, feature_code, status, review_due, decision_id")) as Row[];
      return defaultFeaturePolicies().map((base) => {
        const r = rows.find((x) => x.country_code === base.countryCode && x.feature_code === base.feature);
        const status = r ? String(r.status) : undefined;
        if (!r || !status || !(FEATURE_POLICY_STATUSES as readonly string[]).includes(status)) return base;
        return {
          countryCode: base.countryCode,
          feature: base.feature,
          status: status as CountryFeaturePolicy["status"],
          reviewDue: r.review_due === null ? null : String(r.review_due),
          decisionId: r.decision_id === null ? null : String(r.decision_id),
        };
      });
    },
    async listCountryFeatureDecisions(country?: CountryCode, feature?: PolicyFeature) {
      let q = service().from("country_feature_decisions").select("*").order("decided_at", { ascending: false }).limit(200);
      if (country) q = q.eq("country_code", country);
      if (feature) q = q.eq("feature_code", feature);
      return (check(await q) as Row[])
        .map(toFeatureDecision)
        .filter((d) => isCountry(d.countryCode) && COUNTRY_CODES.includes(d.countryCode) && (POLICY_FEATURES as readonly string[]).includes(d.feature));
    },
    async addCountryFeatureDecision(input) {
      const row = check(await service().from("country_feature_decisions").insert({
        country_code: input.countryCode,
        feature_code: input.feature,
        status: input.status,
        approver_name: input.approverName,
        evidence_ref: input.evidenceRef,
        review_due: input.reviewDue,
        restrictions: input.restrictions,
        note: input.note,
        decided_by: input.decidedBy,
      }).select("*").single()) as Row;
      return toFeatureDecision(row);
    },
    async createAppUser(input): Promise<AppUser> {
      const row = check(await service().from("app_users").insert({ id: input.id, email: input.email }).select("*").single()) as Row;
      return toAppUser(row);
    },
    async getAppUserById(id): Promise<AppUser | null> {
      const { data, error } = await service().from("app_users").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toAppUser(data as Row) : null;
    },
    async getAppUserByEmail(email): Promise<AppUser | null> {
      const { data, error } = await service().from("app_users").select("*").ilike("email", email).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toAppUser(data as Row) : null;
    },
    async markAppUserEmailVerified(id, verifiedAt): Promise<void> {
      check(await service().from("app_users").update({ email_verified_at: verifiedAt }).eq("id", id).select("id"));
    },
    async addConsentRecord(input): Promise<ConsentRecord> {
      const row = check(await service().from("consent_records").insert({
        user_id: input.userId,
        type: input.type,
        evidence_ref: input.evidenceRef,
        method: input.method,
        revoked_at: input.revokedAt ?? null,
      }).select("*").single()) as Row;
      return toConsentRecord(row);
    },
    async listConsentRecords(userId): Promise<ConsentRecord[]> {
      const rows = check(await service().from("consent_records").select("*").eq("user_id", userId)) as Row[];
      return rows.map(toConsentRecord);
    },
    async addAgeVerificationCheck(input): Promise<AgeVerificationCheck> {
      const row = check(await service().from("age_verification_checks").insert({
        user_id: input.userId,
        provider: input.provider,
        provider_ref: input.providerRef,
        status: input.status,
        checked_at: input.checkedAt,
        expires_at: input.expiresAt,
        note: input.note,
      }).select("*").single()) as Row;
      return toAgeVerificationCheck(row);
    },
    async listAgeVerificationChecks(userId): Promise<AgeVerificationCheck[]> {
      const rows = check(await service().from("age_verification_checks").select("*").eq("user_id", userId).order("created_at", { ascending: false })) as Row[];
      return rows.map(toAgeVerificationCheck);
    },
    async createUserProfile(input): Promise<UserProfile> {
      const row = check(await service().from("user_profiles").insert({
        user_id: input.userId,
        handle: input.handle,
        display_name: input.displayName,
        bio: input.bio,
        birth_date: input.birthDate,
        country_code: input.countryCode,
        visibility: input.visibility,
      }).select("*").single()) as Row;
      return toUserProfile(row);
    },
    async getUserProfileByUserId(userId): Promise<UserProfile | null> {
      const { data, error } = await service().from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toUserProfile(data as Row) : null;
    },
    async getUserProfileByHandle(handle): Promise<UserProfile | null> {
      const { data, error } = await service().from("user_profiles").select("*").ilike("handle", handle).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toUserProfile(data as Row) : null;
    },
    async getUserProfileById(id): Promise<UserProfile | null> {
      const { data, error } = await service().from("user_profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toUserProfile(data as Row) : null;
    },
    async updateUserProfile(userId, patch): Promise<UserProfile> {
      const payload: Row = {};
      if (patch.displayName !== undefined) payload.display_name = patch.displayName;
      if (patch.bio !== undefined) payload.bio = patch.bio;
      if (patch.visibility !== undefined) payload.visibility = patch.visibility;
      const row = check(await service().from("user_profiles").update(payload).eq("user_id", userId).select("*").single()) as Row;
      return toUserProfile(row);
    },
    async getPublicUserProfile(userId): Promise<PublicUserProfile | null> {
      const { data, error } = await anon().from("user_profiles_public").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toPublicUserProfile(data as Row) : null;
    },
    async addFollow(followerId, followeeId) {
      const row = check(await service().from("follows").insert({ follower_id: followerId, followee_id: followeeId }).select("*").single()) as Row;
      return { followerId: String(row.follower_id), followeeId: String(row.followee_id), createdAt: String(row.created_at) };
    },
    async removeFollow(followerId, followeeId) {
      check(await service().from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId).select("follower_id"));
    },
    async listFollowing(userId) {
      const rows = check(await service().from("follows").select("followee_id").eq("follower_id", userId)) as Row[];
      return rows.map((r) => String(r.followee_id));
    },
    async listFollowers(userId) {
      const rows = check(await service().from("follows").select("follower_id").eq("followee_id", userId)) as Row[];
      return rows.map((r) => String(r.follower_id));
    },
    async addBlock(blockerId, blockedId) {
      const row = check(await service().from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId }).select("*").single()) as Row;
      return { blockerId: String(row.blocker_id), blockedId: String(row.blocked_id), createdAt: String(row.created_at) };
    },
    async removeBlock(blockerId, blockedId) {
      check(await service().from("user_blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId).select("blocker_id"));
    },
    async listBlocksInvolving(userId): Promise<UserBlock[]> {
      const rows = check(await service().from("user_blocks").select("*").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)) as Row[];
      return rows.map((r) => ({ blockerId: String(r.blocker_id), blockedId: String(r.blocked_id), createdAt: String(r.created_at) }));
    },
    async startOrGetConversation(userA, userB): Promise<Conversation> {
      const mine = check(await service().from("conversation_participants").select("conversation_id").eq("user_id", userA)) as Row[];
      const ids = mine.map((r) => String(r.conversation_id));
      if (ids.length) {
        const match = check(
          await service().from("conversation_participants").select("conversation_id").eq("user_id", userB).in("conversation_id", ids),
        ) as Row[];
        if (match[0]) {
          const conv = check(await service().from("conversations").select("*").eq("id", String(match[0].conversation_id)).single()) as Row;
          return { id: String(conv.id), createdAt: String(conv.created_at) };
        }
      }
      const conv = check(await service().from("conversations").insert({}).select("*").single()) as Row;
      check(await service().from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: userA },
        { conversation_id: conv.id, user_id: userB },
      ]));
      return { id: String(conv.id), createdAt: String(conv.created_at) };
    },
    async listConversationParticipants(conversationId) {
      const rows = check(await service().from("conversation_participants").select("user_id").eq("conversation_id", conversationId)) as Row[];
      return rows.map((r) => String(r.user_id));
    },
    async addMessage(input): Promise<Message> {
      const row = check(await service().from("messages").insert({ conversation_id: input.conversationId, sender_id: input.senderId, body: input.body }).select("*").single()) as Row;
      return toMessage(row);
    },
    async listMessages(conversationId, { limit }): Promise<Message[]> {
      const rows = check(
        await service().from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(limit),
      ) as Row[];
      return rows.map(toMessage).reverse();
    },
    async getMessageById(id): Promise<Message | null> {
      const { data, error } = await service().from("messages").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toMessage(data as Row) : null;
    },
    async addNotification(input): Promise<Notification> {
      const row = check(await service().from("notifications").insert({ user_id: input.userId, type: input.type, payload: input.payload }).select("*").single()) as Row;
      return toNotification(row);
    },
    async listNotifications(userId): Promise<Notification[]> {
      const rows = check(await service().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false })) as Row[];
      return rows.map(toNotification);
    },
    async markNotificationRead(id, userId) {
      check(await service().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id"));
    },
    async createMediaAsset(input): Promise<MediaAsset> {
      const path = `${input.ownerId}/${crypto.randomUUID()}.webp`;
      check(await service().storage.from("user-media").upload(path, input.data, { contentType: input.contentType, upsert: false }));
      const url = service().storage.from("user-media").getPublicUrl(path).data.publicUrl;
      const row = check(
        await service()
          .from("media_assets")
          .insert({
            owner_id: input.ownerId,
            storage_path: `user-media/${path}`,
            url,
            kind: input.kind,
            width: input.width,
            height: input.height,
            duration_seconds: input.durationSeconds,
            status: "ready",
          })
          .select("*")
          .single(),
      ) as Row;
      return toMediaAsset(row);
    },
    async getMediaAsset(id): Promise<MediaAsset | null> {
      const { data, error } = await service().from("media_assets").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toMediaAsset(data as Row) : null;
    },
    async listMediaAssetsByOwner(ownerId): Promise<MediaAsset[]> {
      const rows = check(await service().from("media_assets").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false })) as Row[];
      return rows.map(toMediaAsset);
    },
    async createPost(input): Promise<Post> {
      const row = check(
        await service().from("posts").insert({ author_id: input.authorId, body: input.body, visibility: input.visibility, paid: input.paid }).select("*").single(),
      ) as Row;
      if (input.mediaAssetIds.length) {
        check(await service().from("post_media").insert(input.mediaAssetIds.map((mediaAssetId, position) => ({ post_id: row.id, media_asset_id: mediaAssetId, position }))));
      }
      return toPost(row);
    },
    async getPost(id): Promise<Post | null> {
      const { data, error } = await service().from("posts").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toPost(data as Row) : null;
    },
    async listPostsByAuthor(authorId): Promise<Post[]> {
      const rows = check(await service().from("posts").select("*").eq("author_id", authorId).order("created_at", { ascending: false })) as Row[];
      return rows.map(toPost);
    },
    async listPostMediaIds(postId) {
      const rows = check(await service().from("post_media").select("media_asset_id").eq("post_id", postId).order("position")) as Row[];
      return rows.map((r) => String(r.media_asset_id));
    },
    async listPublicPostsByAuthor(authorId): Promise<PublicPost[]> {
      const rows = check(await anon().from("posts_public").select("*").eq("author_id", authorId).order("created_at", { ascending: false })) as Row[];
      return rows.map(toPublicPost);
    },
    async createCreatorAccount(input): Promise<CreatorAccount> {
      const row = check(
        await service().from("creator_accounts").insert({ user_id: input.userId, legal_name: input.legalName, country_code: input.countryCode }).select("*").single(),
      ) as Row;
      return toCreatorAccount(row);
    },
    async getCreatorAccountByUserId(userId): Promise<CreatorAccount | null> {
      const { data, error } = await service().from("creator_accounts").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toCreatorAccount(data as Row) : null;
    },
    async getCreatorAccountById(id): Promise<CreatorAccount | null> {
      const { data, error } = await service().from("creator_accounts").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toCreatorAccount(data as Row) : null;
    },
    async listCreatorAccounts(filter): Promise<CreatorAccount[]> {
      let q = service().from("creator_accounts").select("*");
      if (filter?.status) q = q.eq("status", filter.status);
      return (check(await q) as Row[]).map(toCreatorAccount);
    },
    async updateCreatorAccountStatus(id, status, actor): Promise<CreatorAccount> {
      const row = check(
        await service().from("creator_accounts").update({ status, approved_by: actor.approvedBy, approved_at: actor.approvedAt }).eq("id", id).select("*").single(),
      ) as Row;
      // Veritabanında bu satırı creator_accounts_sync_role tetikleyicisi yazar.
      return toCreatorAccount(row);
    },
    async addUserRole(userId, role): Promise<void> {
      check(await service().from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" }));
    },
    async listUserRoles(userId): Promise<UserRole[]> {
      const rows = check(await service().from("user_roles").select("role").eq("user_id", userId)) as Row[];
      return rows.map((r) => String(r.role) as UserRole);
    },
    async addContentRights(input): Promise<ContentRights> {
      const row = check(
        await service()
          .from("content_rights")
          .insert({ media_asset_id: input.mediaAssetId, rights_type: input.rightsType, evidence_path: input.evidencePath })
          .select("*")
          .single(),
      ) as Row;
      return toContentRights(row);
    },
    async getContentRightsByMediaAsset(mediaAssetId): Promise<ContentRights | null> {
      const { data, error } = await service().from("content_rights").select("*").eq("media_asset_id", mediaAssetId).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toContentRights(data as Row) : null;
    },
    async listContentRightsForMediaAssets(mediaAssetIds): Promise<ContentRights[]> {
      if (!mediaAssetIds.length) return [];
      const rows = check(await service().from("content_rights").select("*").in("media_asset_id", mediaAssetIds)) as Row[];
      return rows.map(toContentRights);
    },
    async reviewContentRights(id, reviewedBy, reviewedAt): Promise<ContentRights> {
      const row = check(await service().from("content_rights").update({ reviewed_by: reviewedBy, reviewed_at: reviewedAt }).eq("id", id).select("*").single()) as Row;
      return toContentRights(row);
    },
    async createSubscriptionTier(input): Promise<CreatorSubscriptionTier> {
      const row = check(
        await service()
          .from("creator_subscription_tiers")
          .insert({ creator_id: input.creatorId, name: input.name, price_amount: input.priceAmount, price_currency: input.priceCurrency, description: input.description })
          .select("*")
          .single(),
      ) as Row;
      return toSubscriptionTier(row);
    },
    async listSubscriptionTiersByCreator(creatorId): Promise<CreatorSubscriptionTier[]> {
      const rows = check(await service().from("creator_subscription_tiers").select("*").eq("creator_id", creatorId)) as Row[];
      return rows.map(toSubscriptionTier);
    },
    async getSubscriptionTier(id): Promise<CreatorSubscriptionTier | null> {
      const { data, error } = await service().from("creator_subscription_tiers").select("*").eq("id", id).maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toSubscriptionTier(data as Row) : null;
    },
    async addCreatorSubscription(input): Promise<CreatorSubscription> {
      const row = check(
        await service()
          .from("creator_subscriptions")
          .insert({
            subscriber_id: input.subscriberId,
            tier_id: input.tierId,
            status: input.status,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            auto_renew: input.autoRenew,
            external_ref: input.externalRef,
          })
          .select("*")
          .single(),
      ) as Row;
      return toCreatorSubscription(row);
    },
    async listCreatorSubscriptionsBySubscriber(subscriberId): Promise<CreatorSubscription[]> {
      const rows = check(await service().from("creator_subscriptions").select("*").eq("subscriber_id", subscriberId)) as Row[];
      return rows.map(toCreatorSubscription);
    },
    async getActiveSubscription(subscriberId, tierId): Promise<CreatorSubscription | null> {
      const { data, error } = await service()
        .from("creator_subscriptions")
        .select("*")
        .eq("subscriber_id", subscriberId)
        .eq("tier_id", tierId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw new DbError(error.message, error.code);
      return data ? toCreatorSubscription(data as Row) : null;
    },
    async addCreatorPayout(input): Promise<CreatorPayout> {
      const row = check(
        await service()
          .from("creator_payouts")
          .insert({
            creator_id: input.creatorId,
            period_start: input.periodStart,
            period_end: input.periodEnd,
            gross_amount: input.grossAmount,
            platform_fee_amount: input.platformFeeAmount,
            net_amount: input.netAmount,
            status: input.status,
            external_ref: input.externalRef,
          })
          .select("*")
          .single(),
      ) as Row;
      return toCreatorPayout(row);
    },
    async listCreatorPayouts(creatorId): Promise<CreatorPayout[]> {
      const rows = check(await service().from("creator_payouts").select("*").eq("creator_id", creatorId)) as Row[];
      return rows.map(toCreatorPayout);
    },
    async getLocations() {
      const cities = check(await anon().from("cities").select("*").order("plate")) as Row[];
      const plates = new Map(cities.map((r) => [r.id, Number(r.plate)]));
      const districts: import("@/domain/locations").District[] = [];
      for (let from = 0; ; from += 500) {
        const batch = check(await anon().from("districts").select("city_id,name,slug,population").order("id").range(from, from + 499)) as Row[];
        districts.push(...batch.map((r) => ({ plate: plates.get(r.city_id)!, name: String(r.name), slug: String(r.slug), population: Number(r.population ?? 0) })));
        if (batch.length < 500) break;
      }
      return { provinces: cities.map((r) => ({ plate: Number(r.plate), name: String(r.name), slug: String(r.slug), region: String(r.region), metropolitan: Boolean(r.is_metropolitan), coastal: Boolean(r.is_coastal), population: Number(r.population ?? 0), lat: Number(r.lat ?? 0), lng: Number(r.lng ?? 0) })), districts };
    },


    async searchPublicProfiles(filters, { limit, offset, cursor }) {
      let ids: string[] | null = null;
      if (filters.ilgi.length) {
        const rows = check(
          await anon().from("profile_interests_public").select("profile_id, slug").in("slug", filters.ilgi),
        ) as Row[];
        const counts = new Map<string, number>();
        for (const r of rows) counts.set(r.profile_id as string, (counts.get(r.profile_id as string) ?? 0) + 1);
        ids = [...counts].filter(([, n]) => n === filters.ilgi.length).map(([id]) => id);
        if (!ids.length) return { items: [], total: 0 };
      }
      let q = anon().from("discovery_profiles").select("*", { count: "exact" });
      if (filters.il) q = q.eq("city_slug", filters.il);
      else if (filters.ulke) { const [min, max] = plateRange(filters.ulke); q = q.gte("city_plate", min).lte("city_plate", max); }
      if (filters.ilce) q = q.eq("district_slug", filters.ilce);
      const side = sideDistricts(filters);
      if (side) q = q.in("district_slug", [...side]);
      if (filters.yasMin !== undefined) q = q.gte("age", filters.yasMin);
      if (filters.yasMax !== undefined) q = q.lte("age", filters.yasMax);
      if (filters.dogrulanmis) q = q.eq("verified", true);
      if (ids) q = q.in("id", ids);
      if (cursor) q = q.or(`published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`);
      // NULL published_at en sona: imleç her zaman geçerli bir zaman damgası taşır (C-15).
      const res = await q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
      const rows = check(res) as Row[];
      return { items: await hydratePublic(rows), total: res.count ?? rows.length };
    },

    async getPublicProfile(slug) {
      const rows = check(await anon().from("discovery_profiles").select("*").eq("slug", slug).limit(1)) as Row[];
      const [p] = await hydratePublic(rows);
      return p ?? null;
    },

    async listFeaturedProfiles(limit) {
      const rows = check(
        await anon()
          .from("discovery_profiles")
          .select("*")
          .order("sponsored", { ascending: false })
          .order("published_at", { ascending: false })
        .order("id", { ascending: false })
          .limit(limit),
      ) as Row[];
      return hydratePublic(rows);
    },

    async countPublishedByLocation() {
      const counts = new Map<string, { plate: number; districtSlug: string | null; count: number }>();
      const bump = (plate: number, districtSlug: string | null) => {
        const key = `${plate}|${districtSlug ?? ""}`;
        const cur = counts.get(key) ?? { plate, districtSlug, count: 0 };
        cur.count += 1;
        counts.set(key, cur);
      };
      // Aggregate compact location columns in bounded keyset batches, never the full profile table at once.
      let after: string | undefined;
      while (true) {
        let q = anon().from("discovery_profiles").select("id, city_plate, district_slug").order("id").limit(500);
        if (after) q = q.gt("id", after);
        const rows = check(await q) as Row[];
        for (const r of rows) {
          bump(r.city_plate as number, null);
          if (r.district_slug) bump(r.city_plate as number, r.district_slug as string);
        }
        if (rows.length < 500) break;
        after = rows.at(-1)!.id as string;
      }
      return [...counts.values()];
    },

    async listPublicProfileSlugs() {
      const rows = check(await anon().from("discovery_profiles").select("slug, updated_at").eq("is_example", false).eq("noindex", false)) as Row[];
      return rows.map((r) => ({ slug: r.slug as string, updatedAt: r.updated_at as string }));
    },

    async listInterests() {
      const rows = check(await anon().from("interests").select("*")) as Row[];
      return rows
        .map((r) => ({ id: r.id as string, slug: r.slug as string, name: r.name as string, description: (r.description as string) ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    },
    async createInterest(input) {
      const r = check(await service().from("interests").insert(input).select().single()) as Row;
      return { id: r.id as string, slug: r.slug as string, name: r.name as string, description: (r.description as string) ?? null } satisfies Interest;
    },
    async deleteInterest(id) {
      check(await service().from("interests").delete().eq("id", id));
    },

    async listProfiles() {
      const rows = check(await service().from("profiles").select("*").order("updated_at", { ascending: false })) as Row[];
      const ints = await interestIdsFor(rows.map((r) => r.id as string));
      return Promise.all(rows.map((r) => toProfile(r, ints.get(r.id as string) ?? [])));
    },
    async getProfile(id) {
      const r = check(await service().from("profiles").select("*").eq("id", id).maybeSingle()) as Row | null;
      if (!r) return null;
      return toProfile(r, (await interestIdsFor([id])).get(id) ?? []);
    },
    async getProfileBySlug(slug) {
      const r = check(await service().from("profiles").select("*").eq("slug", slug).maybeSingle()) as Row | null;
      if (!r) return null;
      return toProfile(r, (await interestIdsFor([r.id as string])).get(r.id as string) ?? []);
    },
    async createProfile(input) {
      const row = await profileColumns(input);
      const r = check(await service().from("profiles").insert(row).select().single()) as Row;
      await setInterests(r.id as string, input.interestIds);
      return toProfile(r, input.interestIds);
    },
    async updateProfile(id, patch) {
      const current = check(await service().from("profiles").select("city_id").eq("id", id).single()) as Row;
      const loc = await locations();
      const withPlate = { provincePlate: loc.plateByCityId.get(current.city_id as string), ...patch };
      const row = await profileColumns(
        "districtSlug" in patch || "provincePlate" in patch ? withPlate : patch,
      );
      const r = check(await service().from("profiles").update(row).eq("id", id).select().single()) as Row;
      if (patch.interestIds) await setInterests(id, patch.interestIds);
      return toProfile(r, patch.interestIds ?? (await interestIdsFor([id])).get(id) ?? []);
    },
    async deleteProfile(id) {
      check(await service().from("profiles").delete().eq("id", id));
    },

    async listMedia(profileId) {
      return (check(await service().from("profile_media").select("*").eq("profile_id", profileId).order("position")) as Row[]).map(toImage);
    },
    async listAllMedia(filter) {
      let q = service().from("profile_media").select("*").order("position");
      if (filter?.moderation) q = q.eq("moderation", filter.moderation);
      if (filter?.kind) q = q.eq("kind", filter.kind);
      return (check(await q) as Row[]).map(toImage);
    },
    async listAllConsents() { return (check(await service().from("profile_consents").select("*")) as Row[]).map(toConsent); },
    async listAllVerifications() { return (check(await service().from("verification_records").select("*")) as Row[]).map(toVerification); },
    async getMedia(id) {
      const r = check(await service().from("profile_media").select("*").eq("id", id).maybeSingle()) as Row | null;
      return r ? toImage(r) : null;
    },
    async addMedia(input) { return toImage(check(await service().from("profile_media").insert(mediaRow(input)).select().single()) as Row); },
    async updateMedia(id, patch) { return toImage(check(await service().from("profile_media").update(mediaRow(patch)).eq("id", id).select().single()) as Row); },
    async deleteMedia(id) {
      const r = check(await service().from("profile_media").delete().eq("id", id).select().maybeSingle()) as Row | null;
      return r ? toImage(r) : null;
    },
    async storePrivateDocument(path, data, contentType) {
      const [bucket, ...rest] = path.split("/");
      check(await service().storage.from(bucket).upload(rest.join("/"), data, { contentType, upsert: false }));
    },
    async removePrivateDocument(path) {
      const [bucket, ...rest] = path.split("/");
      check(await service().storage.from(bucket).remove([rest.join("/")]));
    },

    async listConsents(profileId) {
      return (check(await service().from("profile_consents").select("*").eq("profile_id", profileId)) as Row[]).map(toConsent);
    },
    async addConsent(input) {
      const r = check(
        await service()
          .from("profile_consents")
          .insert({
            profile_id: input.profileId,
            type: input.type,
            granted_at: input.grantedAt,
            evidence_path: input.evidencePath,
            method: input.method,
            recorded_by: input.recordedBy || null,
          })
          .select()
          .single(),
      ) as Row;
      return toConsent(r);
    },
    async revokeConsent(id, at) {
      return toConsent(check(await service().from("profile_consents").update({ revoked_at: at }).eq("id", id).select().single()) as Row);
    },

    async listVerifications(profileId) {
      return (check(await service().from("verification_records").select("*").eq("profile_id", profileId)) as Row[]).map(toVerification);
    },
    async addVerification(input) {
      const r = check(
        await service()
          .from("verification_records")
          .insert({
            profile_id: input.profileId,
            type: input.type,
            status: input.status,
            method: input.method,
            document_path: input.documentPath,
            checked_by: input.checkedBy,
            checked_at: input.checkedAt,
            retain_until: input.retainUntil,
            note: input.note,
          })
          .select()
          .single(),
      ) as Row;
      return toVerification(r);
    },
    async listExpiredVerificationDocuments(now) {
      return (
        check(
          await service().from("verification_records").select("*").not("document_path", "is", null).lte("retain_until", now),
        ) as Row[]
      ).map(toVerification);
    },
    async clearVerificationDocument(id) {
      check(await service().from("verification_records").update({ document_path: null }).eq("id", id));
    },

    async listReports(filter) {
      let q = service().from("moderation_reports").select("*").order("created_at", { ascending: false });
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.profileId) q = q.eq("profile_id", filter.profileId);
      if (filter?.contentType) q = q.eq("content_type", filter.contentType);
      if (filter?.contentId) q = q.eq("content_id", filter.contentId);
      return (check(await q) as Row[]).map(toReport);
    },
    async getReport(id) {
      const r = check(await service().from("moderation_reports").select("*").eq("id", id).maybeSingle()) as Row | null;
      return r ? toReport(r) : null;
    },
    async createReport(input) {
      const r = check(
        await service()
          .from("moderation_reports")
          .insert({
            profile_id: input.profileId,
            // content_type/content_id verilmezse DB tetikleyicisi (enforce_moderation_content_ref)
            // 'profile'/profileId'den türetir — bkz. 20261027000005 migration.
            content_type: input.contentType,
            content_id: input.contentId,
            category: input.category,
            description: input.description,
            reporter_email: input.reporterEmail,
            reporter_hash: input.reporterHash,
          })
          .select()
          .single(),
      ) as Row;
      return toReport(r);
    },
    async updateReport(id, patch) {
      return toReport(check(await service().from("moderation_reports").update(patch).eq("id", id).select().single()) as Row);
    },
    async countRecentReportsForProfile(profileId, sinceIso) {
      const res = await service().from("moderation_reports").select("id", { count: "exact", head: true }).eq("profile_id", profileId).gte("created_at", sinceIso);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
    async countRecentReportsForContent(contentType, contentId, sinceIso) {
      const res = await service()
        .from("moderation_reports")
        .select("id", { count: "exact", head: true })
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .gte("created_at", sinceIso);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
    async countRecentModerationActions(type, sinceIso) {
      const res = await service().from("moderation_actions").select("id", { count: "exact", head: true }).eq("type", type).gte("created_at", sinceIso);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
    async countRecentReportsByHash(hash, sinceIso) {
      const res = await service()
        .from("moderation_reports")
        .select("id", { count: "exact", head: true })
        .eq("reporter_hash", hash)
        .gte("created_at", sinceIso);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
    async listModerationActions(filter) {
      let q = service().from("moderation_actions").select("*").order("created_at", { ascending: false });
      if (filter.reportId) q = q.eq("report_id", filter.reportId);
      if (filter.profileId) q = q.eq("profile_id", filter.profileId);
      if (filter.contentType) q = q.eq("content_type", filter.contentType);
      if (filter.contentId) q = q.eq("content_id", filter.contentId);
      return (check(await q) as Row[]).map(toAction);
    },
    async addModerationAction(input) {
      const r = check(
        await service()
          .from("moderation_actions")
          .insert({
            report_id: input.reportId,
            profile_id: input.profileId,
            content_type: input.contentType,
            content_id: input.contentId,
            type: input.type,
            note: input.note,
            actor_id: input.actorId,
          })
          .select()
          .single(),
      ) as Row;
      return toAction(r);
    },
    async setContentModerationStatus(contentType, contentId, status) {
      const table = contentType === "user_profile" ? "user_profiles" : contentType === "post" ? "posts" : contentType === "message" ? "messages" : "media_assets";
      check(await service().from(table).update({ moderation_status: status }).eq("id", contentId).select("id"));
    },
    async updateAppUserStatus(userId, status) {
      check(await service().from("app_users").update({ status }).eq("id", userId).select("id"));
    },

    async listPlans() {
      return (check(await anon().from("membership_plans").select("*")) as Row[]).map(toPlan);
    },
    async listSubscriptions(filter) {
      let q = service().from("subscriptions").select("*").order("created_at", { ascending: false });
      if (filter?.profileId) q = q.eq("profile_id", filter.profileId);
      return (check(await q) as Row[]).map(toSubscription);
    },
    async getSubscription(id) {
      const r = check(await service().from("subscriptions").select("*").eq("id", id).maybeSingle()) as Row | null;
      return r ? toSubscription(r) : null;
    },
    async createSubscription(input) {
      const r = check(
        await service()
          .from("subscriptions")
          .insert({
            profile_id: input.profileId,
            plan_id: input.planId,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            status: input.status,
            auto_renew: input.autoRenew,
            sponsored: input.sponsored,
            external_ref: input.externalRef,
            note: input.note,
          })
          .select()
          .single(),
      ) as Row;
      return toSubscription(r);
    },
    async updateSubscription(id, patch) {
      const row: Row = {};
      const map: [keyof typeof patch, string][] = [
        ["planId", "plan_id"], ["startsAt", "starts_at"], ["endsAt", "ends_at"], ["status", "status"], ["autoRenew", "auto_renew"],
        ["sponsored", "sponsored"], ["cancelledAt", "cancelled_at"], ["note", "note"],
      ];
      for (const [k, col] of map) if (k in patch) row[col] = patch[k];
      return toSubscription(check(await service().from("subscriptions").update(row).eq("id", id).select().single()) as Row);
    },

    async addAuditLog(input) {
      check(
        await service()
          .from("audit_logs")
          .insert({ actor_id: input.actorId, action: input.action, entity_type: input.entityType, entity_id: input.entityId, metadata: input.metadata }),
      );
    },
    async listAuditLogs({ limit, entityId }) {
      let q = service().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (entityId) q = q.eq("entity_id", entityId);
      return (check(await q) as Row[]).map(
        (r): AuditLog => ({
          id: r.id as string,
          actorId: (r.actor_id as string) ?? null,
          action: r.action as string,
          entityType: r.entity_type as string,
          entityId: (r.entity_id as string) ?? null,
          metadata: (r.metadata as Record<string, unknown>) ?? {},
          createdAt: r.created_at as string,
        }),
      );
    },

    async createPrivacyRequest(input) {
      const r = check(
        await service()
          .from("privacy_requests")
          .insert({
            type: input.type,
            profile_id: input.profileId,
            profile_url: input.profileUrl,
            requester_name: input.requesterName,
            requester_email: input.requesterEmail,
            relation: input.relation,
            details: input.details,
            due_at: input.dueAt,
          })
          .select()
          .single(),
      ) as Row;
      return toPrivacy(r);
    },
    async listPrivacyRequests() {
      return (check(await service().from("privacy_requests").select("*").order("created_at", { ascending: false })) as Row[]).map(toPrivacy);
    },
    async updatePrivacyRequest(id, patch) {
      const row: Row = {};
      if (patch.status) row.status = patch.status;
      if ("completedAt" in patch) row.completed_at = patch.completedAt;
      if ("profileId" in patch) row.profile_id = patch.profileId;
      return toPrivacy(check(await service().from("privacy_requests").update(row).eq("id", id).select().single()) as Row);
    },

    async hitRateLimit(key, limit, windowSeconds) {
      const rows = check(await service().rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })) as Row[];
      const r = rows[0];
      return { ok: Boolean(r?.allowed), retryAfterSeconds: Number(r?.retry_after_seconds ?? 0) };
    },
    async clearSharedRateLimit(key) {
      check(await service().rpc("rate_limit_clear", { p_key: key }));
    },
    async purgeRateLimits() {
      return Number(check(await service().rpc("rate_limit_purge")) ?? 0);
    },

    async isPublishedMediaUrl(url) {
      const [media, poster, example] = await Promise.all([
        anon().from("profile_media_public").select("profile_id", { count: "exact", head: true }).eq("url", url),
        anon().from("profile_media_public").select("profile_id", { count: "exact", head: true }).eq("poster_url", url),
        anon().from("discovery_profiles").select("id", { count: "exact", head: true }).eq("example_image_url", url),
      ]);
      for (const r of [media, poster, example]) if (r.error) throw new Error(r.error.message);
      return (media.count ?? 0) + (poster.count ?? 0) + (example.count ?? 0) > 0;
    },

    // İletişim mesajları yalnızca service role ile okunur/yazılır; tabloda anon erişimi yoktur (RLS).
    async createContactMessage(input) {
      const r = check(
        await service()
          .from("contact_messages")
          .insert({ category: input.category, name: input.name, email: input.email, subject: input.subject, message: input.message, ip_hash: input.ipHash })
          .select()
          .single(),
      ) as Row;
      return toContact(r);
    },
    async countContactMessagesSince(ipHash, sinceIso) {
      const res = await service().from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceIso);
      if (res.error) throw new DbError(res.error.message, res.error.code);
      return res.count ?? 0;
    },
    async countUnreadContactMessages() {
      const res = await service().from("contact_messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("status", "spam");
      // Migration henüz uygulanmadıysa yönetim paneli çökmesin.
      if (res.error && (res.error.code === "PGRST205" || res.error.code === "42P01")) return 0;
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
    async listContactMessages(filter = {}) {
      let q = service().from("contact_messages").select("*");
      if (filter.status) q = q.eq("status", filter.status);
      if (filter.category) q = q.eq("category", filter.category);
      if (filter.unread) q = q.is("read_at", null);
      return (check(await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500)) as Row[]).map(toContact);
    },
    async deleteContactMessage(id) {
      check(await service().from("contact_messages").delete().eq("id", id));
    },
    async deleteContactMessagesBefore(statuses, beforeIso) {
      const rows = check(await service().from("contact_messages").delete().in("status", statuses).lt("updated_at", beforeIso).select("id")) as Row[];
      return rows.length;
    },
    async getContactMessage(id) {
      const rows = check(await service().from("contact_messages").select("*").eq("id", id).limit(1)) as Row[];
      return rows[0] ? toContact(rows[0]) : null;
    },
    async updateContactMessage(id, patch) {
      const row: Row = {};
      if (patch.status) row.status = patch.status;
      if ("readAt" in patch) row.read_at = patch.readAt;
      return toContact(check(await service().from("contact_messages").update(row).eq("id", id).select().single()) as Row);
    },

    async deleteSeoPage(id) {
      check(await service().from("seo_pages").delete().eq("id", id));
    },
    async listSeoPages() {
      return (check(await anon().from("seo_pages").select("*").order("path")) as Row[]).map(toSeo);
    },
    async getSeoPage(path) {
      const r = check(await anon().from("seo_pages").select("*").eq("path", path).maybeSingle()) as Row | null;
      return r ? toSeo(r) : null;
    },
    async upsertSeoPage(input) {
      const r = check(
        await service()
          .from("seo_pages")
          .upsert(
            {
              path: input.path,
              title: input.title,
              description: input.description,
              canonical: input.canonical,
              index_override: input.indexOverride,
              intro: input.intro,
            },
            { onConflict: "path" },
          )
          .select()
          .single(),
      ) as Row;
      return toSeo(r);
    },
    async getSiteSettings() {
      const r = check(await service().from("site_settings").select("*").single()) as Row;
      return {
        siteName: r.site_name as string,
        supportEmail: r.support_email as string,
        maintenanceMode: Boolean(r.maintenance_mode),
        reportsEnabled: Boolean(r.reports_enabled),
      } satisfies SiteSettings;
    },
    async updateSiteSettings(patch) {
      const row: Row = {};
      if (patch.siteName !== undefined) row.site_name = patch.siteName;
      if (patch.supportEmail !== undefined) row.support_email = patch.supportEmail;
      if (patch.maintenanceMode !== undefined) row.maintenance_mode = patch.maintenanceMode;
      if (patch.reportsEnabled !== undefined) row.reports_enabled = patch.reportsEnabled;
      check(await service().from("site_settings").update(row).eq("id", true));
      return this.getSiteSettings();
    },

    async recordProfileView(profileId, day) {
      check(await service().rpc("increment_profile_view", { p_profile: profileId, p_day: day }));
    },
    async getDailyViews(days, profileId) {
      const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
      let q = service().from("page_views_daily").select("day, views").gte("day", since);
      if (profileId) q = q.eq("profile_id", profileId);
      const rows = check(await q) as Row[];
      const totals = new Map<string, number>();
      for (const r of rows) totals.set(r.day as string, (totals.get(r.day as string) ?? 0) + (r.views as number));
      const out = [];
      for (let d = days - 1; d >= 0; d--) {
        const day = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
        out.push({ day, views: totals.get(day) ?? 0 });
      }
      return out;
    },
    async getDashboardCounts(now): Promise<DashboardCounts> {
      const count = async (table: string, column?: string, values?: string[]) => {
        let q = service().from(table).select("id", { count: "exact", head: true });
        if (column && values) q = q.in(column, values);
        const res = await q;
        if (res.error) throw new Error(res.error.message);
        return res.count ?? 0;
      };
      const subs = (check(await service().from("subscriptions").select("status, starts_at, ends_at")) as Row[]).map((r) => ({
        status: r.status as Subscription["status"],
        startsAt: r.starts_at as string,
        endsAt: r.ends_at as string,
      }));
      const [totalProfiles, published, drafts, inReview, openReports, openPrivacyRequests, unreadContactMessages] = await Promise.all([
        count("profiles"),
        count("profiles", "status", ["published"]),
        count("profiles", "status", ["draft"]),
        count("profiles", "status", ["in_review"]),
        count("moderation_reports", "status", ["open", "in_review", "appealed"]),
        count("privacy_requests", "status", ["received", "in_progress"]),
        this.countUnreadContactMessages(),
      ]);
      return {
        totalProfiles,
        published,
        drafts,
        inReview,
        openReports,
        activeSubscriptions: subs.filter((s) => effectiveStatus(s, now) === "active").length,
        expiringSoon: subs.filter((s) => isExpiringSoon(s, now)).length,
        openPrivacyRequests,
        unreadContactMessages,
      };
    },

    async getAdmin(id) {
      const r = check(await service().from("admins").select("*").eq("id", id).maybeSingle()) as Row | null;
      return r ? toAdmin(r) : null;
    },
    async getAdminByEmail(email) {
      const r = check(await service().from("admins").select("*").eq("email", email).maybeSingle()) as Row | null;
      return r ? toAdmin(r) : null;
    },
  };
}
