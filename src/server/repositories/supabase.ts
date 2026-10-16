import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { effectiveStatus, isExpiringSoon } from "@/domain/subscriptions";
import type {
  Admin,
  AuditLog,
  Interest,
  MembershipPlan,
  ModerationAction,
  ModerationReport,
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

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
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
  profileId: r.profile_id as string,
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
  profileId: r.profile_id as string,
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
      whatsappPhone: (r.whatsapp_phone as string) ?? null,
      age: r.age as number,
      province: {
        plate: r.city_plate as number,
        name: (r.city_name as string) ?? "",
        slug: r.city_slug as string,
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

export function createSupabaseRepository(): Repository {
  return {
    kind: "supabase",
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
      if (filters.ilce) q = q.eq("district_slug", filters.ilce);
      if (filters.yasMin !== undefined) q = q.gte("age", filters.yasMin);
      if (filters.yasMax !== undefined) q = q.lte("age", filters.yasMax);
      if (filters.dogrulanmis) q = q.eq("verified", true);
      if (ids) q = q.in("id", ids);
      if (cursor) q = q.or(`published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`);
      const res = await q
        .order("published_at", { ascending: false })
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
      return (check(await q) as Row[]).map(toAction);
    },
    async addModerationAction(input) {
      const r = check(
        await service()
          .from("moderation_actions")
          .insert({ report_id: input.reportId, profile_id: input.profileId, type: input.type, note: input.note, actor_id: input.actorId })
          .select()
          .single(),
      ) as Row;
      return toAction(r);
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
      const [totalProfiles, published, drafts, inReview, openReports, openPrivacyRequests] = await Promise.all([
        count("profiles"),
        count("profiles", "status", ["published"]),
        count("profiles", "status", ["draft"]),
        count("profiles", "status", ["in_review"]),
        count("moderation_reports", "status", ["open", "in_review", "appealed"]),
        count("privacy_requests", "status", ["received", "in_progress"]),
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
