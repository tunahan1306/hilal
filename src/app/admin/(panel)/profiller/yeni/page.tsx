import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { createProfileAction } from "../../actions";

export const metadata: Metadata = { title: "Yeni profil" };

export default async function NewProfilePage() {
  await requireAdmin();
  const interests = await getRepository().listInterests();
  return (
    <>
      <PageHeader
        title="Yeni profil"
        description="Profil taslak olarak oluşturulur. Yayın için rıza, yaş doğrulaması, fotoğraf hakları ve moderasyon tamamlanmalıdır."
      />
      <div className="rounded-lg border border-hairline p-5 sm:p-6">
        <ProfileForm action={createProfileAction} interests={interests} submitLabel="Taslak oluştur" />
      </div>
    </>
  );
}
