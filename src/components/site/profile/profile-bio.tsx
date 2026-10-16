import type { PublicProfile } from "@/domain/types";

/** Biyografi (Faz 3'te zengin metin render'ı ile değiştirilir). */
export function ProfileBio({ profile }: { profile: PublicProfile }) {
  return (
    <div className="measure font-serif text-prose text-foreground/90">
      {profile.bio.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="mb-5 whitespace-pre-line last:mb-0">{p}</p>
      ))}
    </div>
  );
}
