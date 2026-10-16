import { ActionButton } from "@/components/admin/action-button";
import { InterestForm } from "@/components/admin/simple-forms";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { deleteInterestAction, interestAction } from "../actions";

export default async function InterestsPage() {
  await requireAdmin();
  const repo = getRepository();
  const [interests, profiles] = await Promise.all([repo.listInterests(), repo.listProfiles()]);
  return (
    <>
      <PageHeader title="İlgi alanları" description="Profillerde kullanılan ilgi alanları. Yalnızca sosyal etkinlik ve hobiler eklenmelidir." />
      <section className="mb-6 rounded-xl border border-border/70 bg-card p-5"><InterestForm action={interestAction} /></section>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {interests.map((i) => {
          const used = profiles.filter((p) => p.interestIds.includes(i.id)).length;
          return (
            <li key={i.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">/{i.slug} · {used} profil</p>
              </div>
              <ActionButton action={deleteInterestAction.bind(null, i.id)} variant="ghost" size="sm" confirm={{ title: `“${i.name}” silinsin mi?`, description: `${used} profilden kaldırılacak.`, destructive: true, confirmLabel: "Sil" }}>Sil</ActionButton>
            </li>
          );
        })}
      </ul>
    </>
  );
}
