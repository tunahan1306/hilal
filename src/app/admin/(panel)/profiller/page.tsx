import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProfilesTable, type ProfileRow } from "@/components/admin/profiles-table";
import { Button } from "@/components/ui/button";
import { ageOn } from "@/domain/age";
import { evaluatePublishReadiness, isVerified } from "@/domain/publishing";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { provinceLabel } from "@/server/services/profiles";

export const metadata: Metadata = { title: "Profiller" };

export default async function ProfilesPage({ searchParams }: PageProps<"/admin/profiller">) {
  await requireAdmin();
  const repo = getRepository();
  const now = new Date();
  // Toplu okuma: profil sayısından bağımsız sabit sayıda sorgu.
  const [profiles, reports, interests, allConsents, allVerifications, allImages, durum] = await Promise.all([
    repo.listProfiles(),
    repo.listReports(),
    repo.listInterests(),
    repo.listAllConsents(),
    repo.listAllVerifications(),
    repo.listAllMedia(),
    searchParams.then((s) => (typeof s.durum === "string" ? s.durum : undefined)),
  ]);
  const byProfile = <T extends { profileId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.profileId, [...(m.get(r.profileId) ?? []), r]);
    return m;
  };
  const consentsOf = byProfile(allConsents);
  const verificationsOf = byProfile(allVerifications);
  const imagesOf = byProfile(allImages);
  const rows: ProfileRow[] = profiles.map((p) => {
      const consents = consentsOf.get(p.id) ?? [];
      const verifications = verificationsOf.get(p.id) ?? [];
      const images = imagesOf.get(p.id) ?? [];
      const own = reports.filter((r) => r.profileId === p.id);
      const readiness = evaluatePublishReadiness({
        profile: p, consents, verifications, media: images, reports: own, now,
        interestNames: interests.filter((i) => p.interestIds.includes(i.id)).map((i) => i.name),
      });
      return {
        id: p.id,
        nickname: p.nickname,
        slug: p.slug,
        location: provinceLabel(p),
        age: ageOn(p.birthDate, now),
        status: p.status,
        moderation: p.moderationStatus,
        ready: readiness.ready,
        verified: isVerified(verifications, "identity"),
        openReports: own.filter((r) => r.status === "open" || r.status === "in_review").length,
        updatedAt: p.updatedAt,
        updatedLabel: formatDate(p.updatedAt, { day: "numeric", month: "short", year: "numeric" }),
      };
    });
  return (
    <>
      <PageHeader
        title="Profiller"
        description="Profiller yalnızca yönetim tarafından, profil sahibinin açık yetkilendirmesiyle oluşturulur."
        actions={<Button asChild><Link prefetch={false} href="/admin/profiller/yeni"><Plus className="size-4" aria-hidden /> Yeni profil</Link></Button>}
      />
      <ProfilesTable rows={rows} initialStatus={durum} />
    </>
  );
}
