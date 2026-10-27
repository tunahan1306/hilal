import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserSession } from "@/server/auth/user-session";
import { getRepository } from "@/server/repositories";
import { getPublicProfileByHandle } from "@/server/services/social";
import { ProfileActions } from "./profile-actions";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) notFound();

  const viewer = await getUserSession();
  let isFollowing = false;
  if (viewer && viewer.id !== profile.userId) {
    isFollowing = (await getRepository().listFollowing(viewer.id)).includes(profile.userId);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-10 font-sans">
      <h1 className="text-xl font-semibold tracking-tight">{profile.displayName}</h1>
      <p className="text-muted-foreground">@{profile.handle} · {profile.age} yaş</p>
      {profile.bio ? <p className="mt-4 whitespace-pre-wrap text-sm">{profile.bio}</p> : null}

      {viewer && viewer.id !== profile.userId ? (
        <ProfileActions targetUserId={profile.userId} isFollowing={isFollowing} />
      ) : null}
    </main>
  );
}
