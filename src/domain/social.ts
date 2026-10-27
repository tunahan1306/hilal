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

export type NotificationType = "new_follower" | "new_message";
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
