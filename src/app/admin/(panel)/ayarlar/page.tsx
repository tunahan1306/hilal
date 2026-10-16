import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/simple-forms";
import { requireAdmin } from "@/server/auth/session";
import { isDemoMode } from "@/server/env";
import { getRepository } from "@/server/repositories";
import { settingsAction } from "../actions";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const settings = await getRepository().getSiteSettings();
  return (
    <>
      <PageHeader title="Ayarlar" />
      <section className="mb-6 rounded-xl border border-border/70 bg-card p-5"><SettingsForm action={settingsAction} settings={settings} /></section>
      <section className="rounded-xl border border-border/70 bg-card p-5 text-sm">
        <h2 className="mb-2 font-semibold">Hesap güvenliği</h2>
        <p>{admin.email} · rol: {admin.role}</p>
        <p className="mt-1 text-muted-foreground">
          İki adımlı doğrulama (TOTP) tüm yöneticiler için zorunludur. {isDemoMode() ? "Demo modunda TOTP sırrı ortam değişkeninden okunur." : "Doğrulayıcı değişikliği için Supabase Auth panelini kullanın."}
        </p>
      </section>
    </>
  );
}
