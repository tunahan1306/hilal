import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserSession } from "@/server/auth/user-session";
import { getRepository } from "@/server/repositories";
import { getPublicPostsByHandle, getPublicProfileByHandle } from "@/server/services/social";
import { getPublicSubscriptionTiers } from "@/server/services/creator";
import { ProfileActions } from "./profile-actions";
import { TierList } from "./tier-list";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) notFound();

  const viewer = await getUserSession();
  const [isFollowing, posts, tiers] = await Promise.all([
    viewer && viewer.id !== profile.userId ? (await getRepository().listFollowing(viewer.id)).includes(profile.userId) : false,
    getPublicPostsByHandle(handle, viewer),
    getPublicSubscriptionTiers(profile.userId),
  ]);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-10 font-sans">
      <h1 className="text-xl font-semibold tracking-tight">{profile.displayName}</h1>
      <p className="text-muted-foreground">@{profile.handle} · {profile.age} yaş</p>
      {profile.bio ? <p className="mt-4 whitespace-pre-wrap text-sm">{profile.bio}</p> : null}

      {viewer && viewer.id !== profile.userId ? (
        <ProfileActions targetUserId={profile.userId} isFollowing={isFollowing} />
      ) : null}

      {tiers.length ? (
        <section className="mt-8 border-t border-hairline pt-6">
          <h2 className="text-sm font-medium">Abonelik planları</h2>
          <TierList tiers={tiers} canSubscribe={Boolean(viewer && viewer.id !== profile.userId)} />
        </section>
      ) : null}

      {posts.length ? (
        <section className="mt-8 border-t border-hairline pt-6">
          <h2 className="text-sm font-medium">Gönderiler</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            {posts.map((p) => (
              <li key={p.id} className="rounded-md bg-muted/50 p-3">
                {p.locked ? (
                  <p className="italic text-muted-foreground">🔒 Bu ücretli gönderiyi görmek için abone olun.</p>
                ) : (
                  <p className="whitespace-pre-wrap">{p.body}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
