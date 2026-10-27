import "server-only";
import type { CountryDecision } from "@/domain/country-policy";
import type { CountryFeatureDecision } from "@/domain/policy";
import type { AgeVerificationCheck, AppUser, ConsentRecord, UserRole } from "@/domain/identity";
import type { Conversation, ConversationParticipant, Follow, MediaAsset, Message, Notification, Post, UserBlock, UserProfile } from "@/domain/social";
import type { ContentRights, CreatorAccount, CreatorPayout, CreatorSubscription, CreatorSubscriptionTier } from "@/domain/creator";
import type { PaymentTransaction, WebhookEvent } from "@/domain/billing";
import type { PasswordHash } from "@/server/auth/password";
import { DEFAULT_PLANS } from "@/domain/subscriptions";
import { docFromPlainText, docToPlainText, type RichDoc } from "@/domain/rich-text";
import { slugifyTr } from "@/domain/text";
import type {
  Admin,
  Interest,
  MembershipPlan,
  ModerationReport,
  Profile,
  ProfileConsent,
  ProfileMedia,
  SeoPage,
  Subscription,
  VerificationRecord,
} from "@/domain/types";

/**
 * Yalnızca SENTETİK veri. Kişiler, takma adlar ve görseller gerçek kimseyi temsil
 * etmez; görseller scripts/generate-demo-images.mjs ile üretilmiş soyut çizimlerdir.
 */

const INTERESTS: [string, string][] = [
  ["Kahve sohbetleri", "Yeni kafeler keşfetmek ve uzun sohbetler"],
  ["Doğa yürüyüşü", "Şehir dışı parkurlar ve hafta sonu yürüyüşleri"],
  ["Fotoğrafçılık", "Sokak, doğa ve analog fotoğraf"],
  ["Sinema", "Festival filmleri ve klasikler"],
  ["Kitap kulübü", "Okuma grupları ve edebiyat söyleşileri"],
  ["Canlı müzik", "Konserler, caz geceleri, akustik performanslar"],
  ["Seyahat", "Yeni şehirler ve kültürler"],
  ["Bisiklet", "Şehir içi ve uzun mesafe sürüşler"],
  ["Yemek kültürü", "Yöresel mutfaklar ve atölyeler"],
  ["Yoga", "Nefes, esneme ve farkındalık"],
  ["Tiyatro", "Sahne sanatları ve doğaçlama"],
  ["Gönüllülük", "Sivil toplum ve topluluk projeleri"],
  ["Kamp", "Çadır kampı ve doğada vakit"],
  ["Satranç", "Kafe turnuvaları ve strateji oyunları"],
  ["Dil değişimi", "Yabancı dil pratiği buluşmaları"],
  ["Koşu", "Sabah koşuları ve yarı maratonlar"],
];

type SeedPerson = [nickname: string, plate: number, district: string | null, birthYear: number, bio: string, interests: number[]];

const PEOPLE: SeedPerson[] = [
  ["Deniz", 34, "kadikoy", 1994, "Moda sahilinde akşam yürüyüşlerini ve küçük plak dükkânlarını seviyorum. Hafta sonu kitap kulübüne katılacak yeni arkadaşlar arıyorum.", [0, 4, 5]],
  ["Ece", 34, "besiktas", 1997, "Mimarlık okudum, şehirdeki eski yapıların hikâyelerini merak ediyorum. Fotoğraf yürüyüşleri düzenlemeyi seviyorum.", [2, 6, 0]],
  ["Kaan", 34, "kadikoy", 1991, "Sabahları sahilde koşu, akşamları satranç. Kafe turnuvalarında rakip ve sohbet arkadaşı arıyorum.", [15, 13, 0]],
  ["Mavi", 34, "sisli", 1999, "Tiyatro kulübündeyim, doğaçlama atölyelerine katılıyorum. Yeni oyunları birlikte izleyecek arkadaşlar edinmek isterim.", [10, 3, 5]],
  ["Arda", 34, "uskudar", 1989, "Bisikletle şehir turları ve Boğaz kıyısında fotoğraf. Pazar sabahı sürüş grubuna katılacak kişiler arıyorum.", [7, 2, 1]],
  ["Selin", 34, "beyoglu", 1995, "Caz konserleri, sahaf turları ve uzun kahve molaları. Dil değişimi buluşmalarında İspanyolca pratik yapıyorum.", [5, 14, 0]],
  ["Ozan", 34, "maltepe", 1993, "Yazılım geliştiriciyim; hafta sonları kamp ve doğa yürüyüşüne kaçıyorum. Yeni rotalar önerebilecek arkadaşlar arıyorum.", [12, 1, 6]],
  ["Nil", 34, "atasehir", 1996, "Yoga eğitmeniyim. Sabah pratiği ve sağlıklı mutfak atölyeleri için topluluk oluşturmaya çalışıyorum.", [9, 8, 15]],
  ["Ege", 6, "cankaya", 1992, "Kuğulu Park çevresinde kahve, akşam sinema. Ankara'da yeni açılan kültür mekânlarını birlikte keşfedelim.", [0, 3, 10]],
  ["İpek", 6, "cankaya", 1998, "Üniversitede araştırma görevlisiyim. Kitap kulübü ve müze gezileri için sohbet arkadaşları arıyorum.", [4, 6, 14]],
  ["Tolga", 6, "yenimahalle", 1990, "Eymir çevresinde bisiklet ve koşu. Hafta sonu sabah grubumuza katılmak isteyenler olursa harika olur.", [7, 15, 1]],
  ["Zeynep", 6, "etimesgut", 1995, "Gönüllü olarak hayvan barınağında çalışıyorum. Sivil toplum projelerine ilgi duyan insanlarla tanışmak isterim.", [11, 1, 8]],
  ["Can", 6, "cankaya", 1994, "Klasik müzik ve satranç tutkunuyum. Konser sonrası uzun yürüyüşleri severim.", [5, 13, 0]],
  ["Ada", 35, "karsiyaka", 1996, "Karşıyaka sahilinde bisiklet, Kordon'da gün batımı. İzmir'de fotoğraf yürüyüşü yapacak arkadaşlar arıyorum.", [7, 2, 0]],
  ["Emre", 35, "bornova", 1993, "Ege mutfağına meraklıyım; yerel pazarları gezip tarif denemeyi seviyorum. Yemek atölyesi arkadaşları arıyorum.", [8, 6, 0]],
  ["Lara", 35, "konak", 1997, "Alsancak'ta küçük bir kitapçıda çalışıyorum. Okuma grupları ve şiir akşamları düzenliyorum.", [4, 5, 10]],
  ["Baran", 35, "urla", 1990, "Urla'da yaşıyorum, rüzgâr sörfü ve kamp benim için vazgeçilmez. Doğada vakit geçirmeyi seven insanlarla tanışmak isterim.", [12, 1, 6]],
  ["Ela", 35, "bornova", 1999, "Grafik tasarımcıyım. Sergi açılışları ve analog fotoğraf üzerine sohbet edebileceğim arkadaşlar arıyorum.", [2, 10, 0]],
  ["Mert", 7, "muratpasa", 1992, "Antalya'da dalış eğitmeniyim. Likya Yolu yürüyüşleri ve deniz temizliği gönüllülüğü yapıyorum.", [1, 11, 6]],
  ["Ceren", 7, "konyaalti", 1995, "Konyaaltı'nda sabah yogası ve koşu. Kitap değişimi yapabileceğim bir grup arıyorum.", [9, 15, 4]],
  ["Umut", 16, "nilufer", 1991, "Uludağ eteklerinde yürüyüş ve kamp. Bursa'da yeni insanlarla tanışmak için buradayım.", [1, 12, 0]],
  ["Defne", 16, "osmangazi", 1998, "Tarihi çarşılar, ipek ve el sanatları ilgimi çekiyor. Müze ve kültür turları için arkadaş arıyorum.", [6, 2, 8]],
  ["Kerem", 26, "tepebasi", 1996, "Porsuk kenarında kürek ve bisiklet. Eskişehir'in öğrenci kafelerinde satranç oynamayı severim.", [7, 13, 0]],
  ["Asya", 26, "odunpazari", 1997, "Odunpazarı'nda seramik atölyesine gidiyorum. Sanat ve tiyatro sohbetleri için tanışalım.", [10, 2, 4]],
  ["Barış", 48, "bodrum", 1989, "Bodrum'da yaşıyorum, yelken ve kamp. Kış aylarında kitap kulübü düzenliyoruz.", [12, 4, 6]],
  ["Eylül", 48, "fethiye", 1994, "Fethiye'de doğa rehberiyim. Yürüyüş ve fotoğraf turlarına katılmak isteyenlerle tanışmak isterim.", [1, 2, 6]],
  ["Onur", 61, "ortahisar", 1993, "Karadeniz yaylalarında yürüyüş ve kamp. Yerel mutfak ve kültür üzerine sohbet etmeyi severim.", [1, 12, 8]],
  ["Elif", 1, "seyhan", 1996, "Adana'da öğretmenim. Sinema kulübü ve gönüllü okuma projeleri için yeni arkadaşlar arıyorum.", [3, 11, 4]],
  ["Yiğit", 42, "selcuklu", 1992, "Konya'da yazılımcıyım. Bisiklet turları ve masa oyunları akşamları için grup arıyorum.", [7, 13, 0]],
  ["Melis", 27, "sahinbey", 1997, "Gaziantep mutfağını tanıtmayı seviyorum. Yemek atölyeleri ve şehir yürüyüşleri düzenliyorum.", [8, 6, 0]],
  // Yayında olmayan / eksik ön koşullu örnekler
  ["Taslak Örnek", 34, "kadikoy", 1995, "Henüz tamamlanmamış taslak profil. Yayın yetkilendirmesi bekleniyor.", [0]],
  ["İnceleme Örnek", 6, "cankaya", 1993, "Moderasyon incelemesi bekleyen örnek profil, fotoğraf hakları doğrulanmadı.", [4]],
  ["Arşiv Örnek", 35, "konak", 1990, "Profil sahibinin talebiyle arşivlenmiş örnek profil.", [5]],
];

/** Uzun biçimli zengin biyografi örnekleri (sentetik). */
const LONG_BIOS: Record<string, RichDoc> = {
  Deniz: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Moda sahilinde akşam yürüyüşlerini ve küçük plak dükkânlarını seviyorum. Hafta sonu kitap kulübüne katılacak yeni arkadaşlar arıyorum." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Bir hafta sonum" }] },
      { type: "paragraph", content: [
        { type: "text", text: "Cumartesi sabahları " },
        { type: "text", text: "Kadıköy çarşısında", marks: [{ type: "italic" }] },
        { type: "text", text: " kahvaltıyla başlıyor; öğleden sonra sahafları dolaşıp akşam küçük bir caz kulübünde bitiyor. Pazar günleri kitap kulübümüz Moda'daki bir kafede buluşuyor." },
      ] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Son okuduklarım" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sait Faik'in öyküleri — adaları ve balıkçıları yeniden keşfettim." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bir şehir tarihi kitabı: İstanbul'un semt semt değişimi." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Caz tarihi üzerine bir deneme seçkisi." }] }] },
      ] },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Bir şehri tanımanın en iyi yolu, onu birlikte yürüyebileceğin insanları tanımak." }] }] },
      { type: "paragraph", content: [{ type: "text", text: "Kulübe katılmak isteyen herkes için kural basit: her ay bir kitap, her buluşmada bir öneri. Okuma hızı ya da tür fark etmez; önemli olan sohbet." }] },
    ],
  },
  Ozan: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Yazılım geliştiriciyim; hafta sonları kamp ve doğa yürüyüşüne kaçıyorum. Yeni rotalar önerebilecek arkadaşlar arıyorum." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Favori rotalar" }] },
      { type: "orderedList", attrs: { start: 1 }, content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Belgrad Ormanı sabah turu — 12 km, kolay." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Kaz Dağları iki günlük kamp — orta zorlukta." }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Likya Yolu'nun Faralya–Kabak bölümü." }] }] },
      ] },
      { type: "paragraph", content: [
        { type: "text", text: "Ekipman konusunda " },
        { type: "text", text: "minimalist", marks: [{ type: "bold" }] },
        { type: "text", text: " olmayı seviyorum: hafif çadır, tek tencere, iyi bir kitap. Rota planlamayı ve harita okumayı öğretmekten keyif alırım." },
      ] },
      { type: "horizontalRule" },
      { type: "paragraph", content: [{ type: "text", text: "Kamp kurallarımız için topluluk sayfasına göz atabilirsiniz: " }, { type: "text", text: "topluluk kuralları", marks: [{ type: "link", attrs: { href: "/guvenlik" } }] }, { type: "text", text: "." }] },
    ],
  },
};

const VIDEO_FOR: Record<string, number> = { Deniz: 1, Ozan: 2, Ada: 3, Mert: 1 };

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

export type DemoStore = {
  admins: Admin[];
  adminSecrets: Map<string, { passwordHash: string; totpSecret: string | null }>;
  interests: Interest[];
  profiles: Profile[];
  media: ProfileMedia[];
  consents: ProfileConsent[];
  verifications: VerificationRecord[];
  reports: ModerationReport[];
  actions: import("@/domain/types").ModerationAction[];
  plans: MembershipPlan[];
  subscriptions: Subscription[];
  audit: import("@/domain/types").AuditLog[];
  securityEvents: (import("@/domain/types").NewSecurityEvent & { id: string; createdAt: string })[];
  privacy: import("@/domain/types").PrivacyRequest[];
  contact: import("@/domain/types").ContactMessage[];
  seo: SeoPage[];
  settings: import("@/domain/types").SiteSettings;
  views: Map<string, number>;
  privateFiles: Map<string, { data: Buffer; contentType: string }>;
  /** Ülke yayın kararları (yalnızca eklenir). */
  countryDecisions: CountryDecision[];
  /** Modül G — ülke×özellik politika kararları (yalnızca eklenir; varsayılan boş = fail-closed). */
  featureDecisions: CountryFeatureDecision[];
  /** Modül A — son kullanıcı hesapları (admins'ten AYRI). */
  users: AppUser[];
  /** Yalnızca demo modu: Supabase Auth olmadığında şifre karşılaştırması için (kullanıcı id -> hash). */
  userCredentials: Map<string, PasswordHash>;
  /** Yalnızca demo modu: gerçek e-posta gönderimi yoktur, doğrulama jetonu bellekte tutulur. */
  emailVerificationTokens: Map<string, string>;
  consentRecords: ConsentRecord[];
  ageVerificationChecks: AgeVerificationCheck[];
  /** Modül B — sosyal platform (admin-küratörlü profiles'tan AYRI). */
  userProfiles: UserProfile[];
  follows: Follow[];
  userBlocks: UserBlock[];
  conversations: Conversation[];
  conversationParticipants: ConversationParticipant[];
  messages: Message[];
  notifications: Notification[];
  /** Modül A — kullanıcı rolleri (creator onayıyla senkronize edilir, bkz. memory.ts updateCreatorAccountStatus). */
  userRoles: { userId: string; role: UserRole }[];
  /** Modül B kapanışı + Modül C — posts/media_assets Modül C'nin content_rights'ıyla birlikte ele alınmıştı. */
  mediaAssets: MediaAsset[];
  posts: Post[];
  postMedia: { postId: string; mediaAssetId: string }[];
  creatorAccounts: CreatorAccount[];
  contentRights: ContentRights[];
  creatorSubscriptionTiers: CreatorSubscriptionTier[];
  creatorSubscriptions: CreatorSubscription[];
  creatorPayouts: CreatorPayout[];
  /** Modül F — yalnızca şema; gerçek sağlayıcı olmadan hiçbir satır gerçek bir satın almayla oluşamaz. */
  paymentTransactions: PaymentTransaction[];
  webhookEvents: WebhookEvent[];
  counter: number;
};

export function createDemoStore(now: Date): DemoStore {
  seed = 42;
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86_400_000).toISOString();
  const adminId = "admin-0001";

  const interests: Interest[] = INTERESTS.map(([name, description], i) => ({
    id: id("int", i + 1),
    slug: slugifyTr(name),
    name,
    description,
  }));

  const plans: MembershipPlan[] = DEFAULT_PLANS.map((p, i) => ({ ...p, id: id("plan", i + 1) }));

  const profiles: Profile[] = [];
  const media: ProfileMedia[] = [];
  const consents: ProfileConsent[] = [];
  const verifications: VerificationRecord[] = [];
  const subscriptions: Subscription[] = [];

  PEOPLE.forEach(([nickname, plate, district, birthYear, bio, interestIdx], i) => {
    const n = i + 1;
    const pid = id("prf", n);
    const special = nickname.endsWith("Örnek");
    const status: Profile["status"] = !special
      ? "published"
      : nickname.startsWith("Taslak")
        ? "draft"
        : nickname.startsWith("İnceleme")
          ? "in_review"
          : "archived";
    const created = iso(-120 + i * 3);
    profiles.push({
      id: pid,
      slug: `${slugifyTr(nickname)}-${(1000 + n * 37).toString(36)}`,
      nickname,
      birthDate: `${birthYear}-${String(1 + (n % 12)).padStart(2, "0")}-${String(1 + (n % 27)).padStart(2, "0")}`,
      provincePlate: plate,
      districtSlug: district,
      bio: LONG_BIOS[nickname] ? docToPlainText(LONG_BIOS[nickname]) : bio,
      bioDoc: LONG_BIOS[nickname] ?? docFromPlainText(bio),
      interestIds: interestIdx.map((k) => interests[k].id),
      status,
      moderationStatus: status === "published" || status === "archived" ? "approved" : "pending",
      moderationNote: null,
      moderatedBy: status === "published" ? adminId : null,
      moderatedAt: status === "published" ? iso(-100 + i * 3) : null,
      publishedAt: status === "published" || status === "archived" ? iso(-90 + i * 3) : null,
      archivedAt: status === "archived" ? iso(-5) : null,
      seoTitle: null,
      seoDescription: null,
      noindex: false,
      createdBy: adminId,
      createdAt: created,
      updatedAt: iso(-30 + (i % 20)),
    });

    // Galeri: kapakta soyut portre, ardından portre ve sahne karışımı (3–10 görsel)
    const approved = status !== "in_review" && status !== "draft";
    const imageCount = 3 + Math.floor(rnd() * 8);
    const mediaBase = (k: number) => ({
      profileId: pid,
      status: "ready" as const,
      thumbPath: null,
      publicPaths: [],
      bytes: 180_000 + k * 1000,
      durationSeconds: null,
      position: k,
      isCover: k === 0,
      rightsConfirmed: approved,
      ownershipSource: approved ? ("owner" as const) : null,
      ownershipNote: approved ? "Profil sahibinin kendi çekimi (demo)" : null,
      rightsConfirmedBy: approved ? adminId : null,
      rightsConfirmedAt: approved ? created : null,
      moderation: approved ? ("approved" as const) : ("pending" as const),
      moderatedBy: approved ? adminId : null,
      moderatedAt: approved ? created : null,
      sha256: null,
      dhash: null,
      failureReason: null,
      createdAt: created,
    });
    for (let k = 0; k < imageCount; k++) {
      const portrait = k === 0 || k % 3 === 0;
      const sceneIndex = ((n * 5 + k) % 24) + 1;
      const file = portrait ? `portrait-${((n * 7 + k) % 30) + 1}.webp` : `scene-${sceneIndex}.webp`;
      const landscape = !portrait && sceneIndex % 3 !== 0;
      media.push({
        ...mediaBase(k),
        id: id("img", media.length + 1),
        kind: "image",
        storagePath: `demo/${file}`,
        // Demo dosyaları zaten statik olarak sunulur; yalnızca yayındaki profillerde kamu adresi atanır
        publicUrl: status === "published" ? `/demo/${file}` : null,
        publicPosterUrl: null,
        mimeType: "image/webp",
        alt: portrait ? `${nickname} için sentetik, soyut portre görseli` : `${nickname} profilinde sentetik manzara görseli`,
        width: portrait ? 1200 : landscape ? 1600 : 1200,
        height: portrait ? 1500 : landscape ? 1200 : 1600,
      });
    }
    const v = VIDEO_FOR[nickname];
    if (v) {
      media.push({
        ...mediaBase(imageCount),
        isCover: false,
        id: id("vid", media.length + 1),
        kind: "video",
        storagePath: `demo/video-${v}.webm`,
        thumbPath: `demo/video-${v}-poster.webp`,
        publicUrl: status === "published" ? `/demo/video-${v}.webm` : null,
        publicPosterUrl: status === "published" ? `/demo/video-${v}-poster.webp` : null,
        mimeType: "video/webm",
        bytes: 600_000,
        durationSeconds: 6,
        alt: `${nickname} profilinde sentetik, soyut kısa video`,
        width: 720,
        height: 900,
      });
    }

    if (status !== "draft") {
      for (const type of ["publication", "photo_rights", "data_processing"] as const) {
        if (status === "in_review" && type === "photo_rights") continue;
        consents.push({
          id: id("cns", consents.length + 1),
          profileId: pid,
          type,
          grantedAt: created,
          revokedAt: null,
          evidencePath: null,
          method: "Islak imzalı muvafakatname (demo)",
          recordedBy: adminId,
        });
      }
      verifications.push({
        id: id("ver", verifications.length + 1),
        profileId: pid,
        type: "age",
        status: "approved",
        method: "Kimlik belgesi yüz yüze kontrol (demo)",
        documentPath: null,
        checkedBy: adminId,
        checkedAt: created,
        retainUntil: null,
        note: null,
        createdAt: created,
      });
      if (n % 3 !== 0) {
        verifications.push({
          id: id("ver", verifications.length + 1),
          profileId: pid,
          type: "identity",
          status: "approved",
          method: "Görüntülü görüşme ile kimlik eşleştirme (demo)",
          documentPath: null,
          checkedBy: adminId,
          checkedAt: created,
          retainUntil: null,
          note: null,
          createdAt: created,
        });
      }
    }

    if (status === "published") {
      const plan = plans[n % 3];
      const startOffset = -20 - (n % 10) * 3;
      const lengthDays = n % 5 === 0 ? 25 : 60;
      subscriptions.push({
        id: id("sub", subscriptions.length + 1),
        profileId: pid,
        planId: plan.id,
        startsAt: iso(startOffset),
        endsAt: iso(startOffset + lengthDays),
        status: "active",
        autoRenew: n % 2 === 0,
        sponsored: plan.sponsoredEligible && n % 9 === 1,
        cancelledAt: null,
        externalRef: null,
        note: "Demo kaydı — tahsilat yapılmadı",
        createdAt: iso(startOffset),
      });
    }
  });

  const reports: ModerationReport[] = [
    {
      id: id("rep", 1),
      profileId: profiles[3].id,
      contentType: "profile",
      contentId: profiles[3].id,
      category: "fake_profile",
      description: "Bu profilin başka bir sitedeki fotoğrafları kullandığını düşünüyorum. (demo)",
      reporterEmail: null,
      status: "open",
      resolution: null,
      reporterHash: "demo",
      createdAt: iso(-2),
      updatedAt: iso(-2),
    },
    {
      id: id("rep", 2),
      profileId: profiles[8].id,
      contentType: "profile",
      contentId: profiles[8].id,
      category: "other",
      description: "Profil açıklamasında yazım hatası var, bilgi amaçlı. (demo)",
      reporterEmail: null,
      status: "resolved",
      resolution: "Açıklama güncellendi.",
      reporterHash: "demo",
      createdAt: iso(-12),
      updatedAt: iso(-10),
    },
  ];

  const seo: SeoPage[] = [
    {
      id: id("seo", 1),
      path: "/sehir/istanbul",
      title: null,
      description: null,
      canonical: null,
      indexOverride: null,
      intro:
        "İstanbul'da sosyal çevre edinmek isteyenler için kitap kulüplerinden sahil yürüyüşlerine kadar ortak ilgi alanlarına göre profilleri keşfedin. Kadıköy, Beşiktaş ve Üsküdar gibi ilçelerde kültür etkinlikleri oldukça yoğundur.",
      updatedAt: iso(-3),
    },
    {
      id: id("seo", 2),
      path: "/sehir/ankara",
      title: null,
      description: null,
      canonical: null,
      indexOverride: null,
      intro:
        "Ankara'da müze gezileri, Eymir çevresinde koşu grupları ve Çankaya'daki kültür mekânları etrafında şekillenen sosyal profilleri inceleyin.",
      updatedAt: iso(-3),
    },
  ];

  return {
    admins: [
      {
        id: adminId,
        email: "admin@demo.local",
        displayName: "Demo Yönetici",
        role: "owner",
        mfaEnrolled: true,
        createdAt: iso(-200),
      },
    ],
    adminSecrets: new Map(),
    // Demo verisinde yalnızca Türkiye açıktır; NL/DE incelenmemiş durumda kalır (gerçek davranışla aynı varsayılan).
    countryDecisions: [{
      id: "cdec-demo-tr",
      countryCode: "tr",
      status: "permitted",
      approverName: "DEMO — gerçek bir hukuki onay değildir",
      evidenceRef: "DEMO-ONLY",
      reviewDue: iso(365).slice(0, 10),
      restrictions: null,
      note: "Bellek içi demo verisi",
      decidedBy: adminId,
      decidedAt: iso(-30),
    }],
    // Yeni modüllerin (B/C/F) hiçbiri için henüz bir karar yok — demo verisinde de fail-closed.
    featureDecisions: [],
    // Modül A: demo verisinde henüz kayıtlı son kullanıcı yok; kayıt akışıyla eklenir.
    users: [],
    userCredentials: new Map(),
    emailVerificationTokens: new Map(),
    consentRecords: [],
    ageVerificationChecks: [],
    userProfiles: [],
    follows: [],
    userBlocks: [],
    conversations: [],
    conversationParticipants: [],
    messages: [],
    notifications: [],
    userRoles: [],
    mediaAssets: [],
    posts: [],
    postMedia: [],
    creatorAccounts: [],
    contentRights: [],
    creatorSubscriptionTiers: [],
    creatorSubscriptions: [],
    creatorPayouts: [],
    paymentTransactions: [],
    webhookEvents: [],
    interests,
    profiles,
    media,
    consents,
    verifications,
    reports,
    actions: [],
    plans,
    subscriptions,
    audit: [],
    securityEvents: [],
    privacy: [],
    contact: [],
    seo,
    settings: {
      siteName: "Hilal",
      supportEmail: "destek@example.com",
      maintenanceMode: false,
      reportsEnabled: true,
    },
    views: seedViews(profiles, now),
    privateFiles: new Map(),
    counter: 10_000,
  };
}

function seedViews(profiles: Profile[], now: Date): Map<string, number> {
  const views = new Map<string, number>();
  for (let d = 0; d < 30; d++) {
    const day = new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    for (const p of profiles.filter((p) => p.status === "published")) {
      views.set(`${p.id}|${day}`, Math.floor(rnd() * 25));
    }
  }
  return views;
}
