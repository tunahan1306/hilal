// Modül B — Sosyal Platform. Kaynak: user_profiles / follows / user_blocks / conversations /
// conversation_participants / messages / notifications (20261027000003_social_platform.sql).
// Admin-küratörlü `profiles` ürününden AYRI (bkz. docs/transformation/00_AUDIT.md).

export const PROFILE_VISIBILITIES = ["public", "followers_only", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export type UserProfile = {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  birthDate: string;
  countryCode: string;
  visibility: ProfileVisibility;
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
export type NewUserProfile = Omit<UserProfile, "id" | "moderationStatus" | "createdAt" | "updatedAt">;
export type UserProfilePatch = Partial<Pick<UserProfile, "displayName" | "bio" | "visibility">>;

/** Kamuya açık izdüşüm — user_profiles_public view'ının birebir karşılığı (birth_date asla yok). */
export type PublicUserProfile = {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  age: number;
  countryCode: string;
  createdAt: string;
};

export type Follow = { followerId: string; followeeId: string; createdAt: string };
export type UserBlock = { blockerId: string; blockedId: string; createdAt: string };

export type Conversation = { id: string; createdAt: string };
export type ConversationParticipant = { conversationId: string; userId: string; joinedAt: string; lastReadAt: string | null };
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  moderationStatus: "pending" | "approved" | "rejected";
};

/** moderation_warning — Modül E'nin genelleştirilmiş triyajı (bkz. src/server/services/content-moderation.ts); notifications.type bir enum değil, metin kısıtıdır, bu yüzden yeni değer migration gerektirmez. */
export type NotificationType = "new_follower" | "new_message" | "moderation_warning";
export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

/** Handle formatı — veritabanındaki check kısıtıyla birebir (a-z, 0-9, alt çizgi, 3-30 karakter). */
export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(handle);
}

/** İki kullanıcı arasında (herhangi bir yönde) engel var mı? */
export function isBlockedEitherWay(blocks: UserBlock[], a: string, b: string): boolean {
  return blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

/** Takip edilebilir mi? (kendini takip edemez, engel varsa edemez). */
export function canFollow(actorId: string, targetId: string, blocks: UserBlock[]): boolean {
  return actorId !== targetId && !isBlockedEitherWay(blocks, actorId, targetId);
}

// --- Modül B kapanışı: posts / media_assets ----------------------------------------
// Modül B migration'ında (20261027000003) KASITLI OLARAK ertelenmişti — Modül C'nin
// content_rights'ıyla birlikte 20261027000004_creator_platform.sql'de tanımlanır,
// çünkü ücretli bir gönderi yalnızca ekli medyanın hak kaydı incelendiğinde yayına girer.

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_ASSET_STATUSES = ["processing", "ready", "rejected"] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export type MediaAsset = {
  id: string;
  ownerId: string;
  storagePath: string;
  url: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  status: MediaAssetStatus;
  rightsConfirmed: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  body: string;
  visibility: ProfileVisibility;
  paid: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
export type NewPost = { authorId: string; body: string; visibility: ProfileVisibility; paid: boolean; mediaAssetIds: string[] };

/** Herkese açık akışta görünen gönderi izdüşümü — posts_public view ile birebir (paylı gönderide body her zaman gelir; abonelik yoksa UI/servis katmanı gizler). */
export type PublicPost = { id: string; authorId: string; body: string; paid: boolean; createdAt: string };
