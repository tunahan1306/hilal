import type { Metadata } from "next";
import { requireUser } from "@/server/auth/user-session";
import { getRepository } from "@/server/repositories";
import { isAgeVerified } from "@/domain/identity";
import { AccountPanel } from "./account-panel";

export const metadata: Metadata = { title: "Hesabım" };

export default async function AccountPage() {
  const user = await requireUser();
  const repo = getRepository();
  const [checks, profile, notifications, creatorAccount, posts, mediaAssets] = await Promise.all([
    repo.listAgeVerificationChecks(user.id),
    repo.getUserProfileByUserId(user.id),
    repo.listNotifications(user.id),
    repo.getCreatorAccountByUserId(user.id),
    // Gönderi/medya herhangi bir kullanıcı içindir (yalnızca "paid" creator hesabı ister) — bkz. services/social.ts.
    repo.listPostsByAuthor(user.id),
    repo.listMediaAssetsByOwner(user.id),
  ]);
  const [tiers, rights] = await Promise.all([
    creatorAccount ? repo.listSubscriptionTiersByCreator(creatorAccount.id) : Promise.resolve([]),
    mediaAssets.length ? repo.listContentRightsForMediaAssets(mediaAssets.map((m) => m.id)) : Promise.resolve([]),
  ]);
  return (
    <AccountPanel
      user={user}
      ageVerified={isAgeVerified(checks)}
      profile={profile}
      notifications={notifications}
      creatorAccount={creatorAccount}
      posts={posts}
      mediaAssets={mediaAssets}
      contentRights={rights}
      tiers={tiers}
    />
  );
}
