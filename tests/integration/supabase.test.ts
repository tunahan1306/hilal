import { docFromPlainText } from "@/domain/rich-text";
/**
 * Supabase repository entegrasyon testi. Yerel Supabase gerekir:
 *   supabase start && supabase db reset
 *   eval "$(supabase status -o env | sed 's/^/export /')"   # veya scripts/test-integration.sh
 * Tüm veriler sentetiktir ve test sonunda silinir.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Admin } from "@/domain/types";
import { getRepository } from "@/server/repositories";
import { PublishBlockedError } from "@/server/services/errors";
import { submitReport } from "@/server/services/moderation";
import * as profiles from "@/server/services/profiles";
import { cancelSubscription, createSubscription } from "@/server/services/subscriptions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const enabled = Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const service = enabled ? createClient(url!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) : null;
const anon = enabled ? createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } }) : null;

let admin: Admin;
const created: string[] = [];
const email = `it-admin-${Date.now()}@test.local`;

describe.skipIf(!enabled)("Supabase repository (entegrasyon)", () => {
  beforeAll(async () => {
    expect(getRepository().kind).toBe("supabase");
    const { data, error } = await service!.auth.admin.createUser({ email, password: "Integration-Test-1234!", email_confirm: true });
    if (error) throw error;
    const ins = await service!.from("admins").insert({ id: data.user.id, email, display_name: "IT", role: "owner" });
    if (ins.error) throw ins.error;
    admin = (await getRepository().getAdmin(data.user.id))!;
  });

  afterAll(async () => {
    for (const id of created) await getRepository().deleteProfile(id).catch(() => {});
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  const input = {
    nickname: "Entegrasyon",
    birthDate: "1992-02-02",
    provincePlate: 6,
    districtSlug: "cankaya",
    bio: "Supabase entegrasyon testi için oluşturulmuş sentetik profil.",
    bioDoc: docFromPlainText("Yetişkinler için sentetik sosyal test profili."),
  interestIds: [] as string[],
    seoTitle: null,
    seoDescription: null,
    noindex: false,
  };

  it("tam yaşam döngüsü: oluştur → engel → koşullar → yayın → kamu görünümü → şikâyet → silme", async () => {
    const repo = getRepository();
    const interests = await repo.listInterests();
    expect(interests.length).toBeGreaterThan(10);
    const p = await profiles.createProfile(admin, { ...input, interestIds: [interests[0].id, interests[1].id] });
    created.push(p.id);
    expect(p.provincePlate).toBe(6);
    expect(p.districtSlug).toBe("cankaya");
    expect(p.interestIds).toHaveLength(2);

    await expect(profiles.publishProfile(admin, p.id)).rejects.toBeInstanceOf(PublishBlockedError);

    // Veritabanı tetikleyicisi de doğrudan güncellemeyi engeller
    const direct = await service!.from("profiles").update({ status: "published" }).eq("id", p.id);
    expect(direct.error?.message).toMatch(/Yayın engellendi/);

    await profiles.recordConsent(admin, p.id, "publication", "entegrasyon", Buffer.from("%PDF-1.4 test"));
    await profiles.recordConsent(admin, p.id, "photo_rights", "entegrasyon");
    await profiles.recordVerification(admin, p.id, { type: "age", status: "approved", method: "entegrasyon", note: null }, Buffer.from("%PDF-1.4 x"));
    await profiles.recordVerification(admin, p.id, { type: "identity", status: "approved", method: "entegrasyon", note: null });
    const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#557788" } }).png().toBuffer();
    const img = await profiles.uploadProfileImage(admin, p.id, png, "Sentetik");
    expect(img.publicUrl).toBeNull();

    // Özel belgeler anon tarafından okunamaz
    const consents = await repo.listConsents(p.id);
    const evidence = consents.find((c) => c.evidencePath)!.evidencePath!;
    const [bucket, ...rest] = evidence.split("/");
    const leaked = await anon!.storage.from(bucket).download(rest.join("/"));
    expect(leaked.error).not.toBeNull();

    await profiles.confirmImageRights(admin, p.id, img.id, true);
    await profiles.setModeration(admin, p.id, "approved", null);
    const published = await profiles.publishProfile(admin, p.id);
    expect(published.status).toBe("published");

    // Kamu görünümü (anon + view)
    const pub = await repo.getPublicProfile(p.slug);
    expect(pub).not.toBeNull();
    expect(pub!.age).toBeGreaterThanOrEqual(18);
    expect(pub!.verified).toBe(true);
    expect(pub!.district?.name).toBe("Çankaya");
    expect(pub!.interests).toHaveLength(2);
    expect(pub!.images).toHaveLength(1);
    const search = await repo.searchPublicProfiles({ il: "ankara", ilce: "cankaya", ilgi: [interests[0].slug], dogrulanmis: true, sayfa: 1 }, { limit: 10, offset: 0 });
    expect(search.items.map((x) => x.id)).toContain(p.id);
    const counts = await repo.countPublishedByLocation();
    expect(counts.find((c) => c.plate === 6 && c.districtSlug === "cankaya")?.count).toBeGreaterThanOrEqual(1);

    // anon profiles tablosuna doğrudan erişemez; view doğum tarihi sızdırmaz
    const raw = await anon!.from("profiles").select("birth_date").limit(1);
    expect(raw.error).not.toBeNull();
    const viewRow = await anon!.from("profiles_public").select("*").eq("id", p.id).single();
    expect(viewRow.data).not.toHaveProperty("birth_date");

    // Abonelik
    const plan = (await repo.listPlans()).find((x) => x.code === "premium")!;
    const sub = await createSubscription(admin, { profileId: p.id, planId: plan.id, startsAt: new Date().toISOString().slice(0, 10), months: 1, sponsored: true });
    expect((await repo.getPublicProfile(p.slug))!.sponsored).toBe(true);
    await cancelSubscription(admin, sub.id, "test");
    expect((await repo.getPublicProfile(p.slug))!.sponsored).toBe(false);

    // Toplu okumalar (yönetim listesi) ve kötüye kullanım sayaçları
    expect((await repo.listAllMedia()).some((i) => i.profileId === p.id)).toBe(true);
    expect((await repo.listAllConsents()).filter((c) => c.profileId === p.id)).toHaveLength(2);
    expect((await repo.listAllVerifications()).filter((v) => v.profileId === p.id)).toHaveLength(2);
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const autoBefore = await repo.countRecentModerationActions("auto_unpublished", hourAgo);
    expect(await repo.countRecentReportsForProfile(p.id, hourAgo)).toBe(0);

    // Kritik şikâyet → otomatik yayından kaldırma
    const { autoUnpublished } = await submitReport({ profileId: p.id, category: "suspected_minor", description: "Entegrasyon testi kritik şikâyet." }, `it-${Date.now()}`);
    expect(autoUnpublished).toBe(true);
    expect(await repo.getPublicProfile(p.slug)).toBeNull();
    expect(await repo.countRecentReportsForProfile(p.id, hourAgo)).toBe(1);
    expect(await repo.countRecentModerationActions("auto_unpublished", hourAgo)).toBe(autoBefore + 1);
    await expect(profiles.publishProfile(admin, p.id)).rejects.toBeInstanceOf(PublishBlockedError);

    // Denetim kaydı değiştirilemez
    const logs = await repo.listAuditLogs({ limit: 50, entityId: p.id });
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(["profile.create", "profile.published", "profile.auto_unpublished"]));
    const tamper = await service!.from("audit_logs").update({ action: "x" }).eq("id", logs[0].id);
    expect(tamper.error).not.toBeNull();

    // Görüntüleme sayacı
    const today = new Date().toISOString().slice(0, 10);
    await repo.recordProfileView(p.id, today);
    await repo.recordProfileView(p.id, today);
    expect((await repo.getDailyViews(1, p.id))[0].views).toBe(2);

    // KVKK: dışa aktar + kalıcı sil (depolama dahil)
    const exported = await profiles.exportProfileData(admin, p.id);
    expect(JSON.stringify(exported)).not.toContain("verification-documents/");
    await profiles.deleteProfilePermanently(admin, p.id, "entegrasyon");
    expect(await repo.getProfile(p.id)).toBeNull();
    expect((await fetch(pub!.images[0].url)).status).not.toBe(200);
    created.splice(created.indexOf(p.id), 1);
  });

  it("rıza geri alınınca profil yayından kalkar (tetikleyici + servis)", async () => {
    const p = await profiles.createProfile(admin, input);
    created.push(p.id);
    await profiles.recordConsent(admin, p.id, "publication", "x");
    await profiles.recordConsent(admin, p.id, "photo_rights", "x");
    await profiles.recordVerification(admin, p.id, { type: "age", status: "approved", method: "x", note: null });
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#123456" } }).png().toBuffer();
    const img = await profiles.uploadProfileImage(admin, p.id, png, "x");
    await profiles.confirmImageRights(admin, p.id, img.id, true);
    await profiles.setModeration(admin, p.id, "approved", null);
    await profiles.publishProfile(admin, p.id);
    const c = (await getRepository().listConsents(p.id)).find((x) => x.type === "publication")!;
    await profiles.revokeConsent(admin, p.id, c.id);
    expect((await getRepository().getProfile(p.id))!.status).toBe("unpublished");
  });

  it("dashboard sayaçları ve SEO sayfaları çalışır", async () => {
    const repo = getRepository();
    const counts = await repo.getDashboardCounts(new Date());
    expect(counts.totalProfiles).toBeGreaterThanOrEqual(0);
    const seo = await repo.upsertSeoPage({ path: "/sehir/ankara", title: "Ankara", description: null, canonical: null, indexOverride: null, intro: "Test tanıtım" });
    expect((await repo.getSeoPage("/sehir/ankara"))?.intro).toBe("Test tanıtım");
    await service!.from("seo_pages").delete().eq("id", seo.id);
    const settings = await repo.updateSiteSettings({ reportsEnabled: true });
    expect(settings.siteName).toBe("Hilal");
  });
});
