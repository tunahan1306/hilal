import type { Metadata } from "next";
import { Suspense } from "react";
import { PrivacyRequestForm } from "@/components/site/privacy-request-form";
import { ProsePage } from "@/components/site/prose-page";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Profil kaldırma ve KVKK başvurusu",
  description: "Profilinizin kaldırılması, verilerinize erişim veya silinmesi için başvuru yapın.",
  alternates: { canonical: "/kaldirma-talebi" },
};

export default function RemovalRequestPage({ searchParams }: PageProps<"/kaldirma-talebi">) {
  return (
    <ProsePage
      eyebrow="Haklarınız"
      title="Profil kaldırma ve KVKK başvurusu"
      path="/kaldirma-talebi"
      lead="Profil sahibiyseniz veya fotoğrafınızın izinsiz kullanıldığını düşünüyorsanız bize bildirin. Başvurular en geç 30 gün içinde sonuçlandırılır."
    >
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-2xl bg-muted" />}>
        <FormWithDefaults searchParams={searchParams} />
      </Suspense>
    </ProsePage>
  );
}

async function FormWithDefaults({ searchParams }: Pick<PageProps<"/kaldirma-talebi">, "searchParams">) {
  const profil = (await searchParams).profil;
  const slug = typeof profil === "string" && /^[a-z0-9-]{1,100}$/.test(profil) ? profil : undefined;
  return <PrivacyRequestForm defaultProfileUrl={slug ? `${siteUrl()}/profil/${slug}` : undefined} />;
}
