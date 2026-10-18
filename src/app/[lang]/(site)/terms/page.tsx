import type { Metadata } from "next";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { LegalDraftNotice, ProsePage } from "@/components/site/prose-page";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  const meta = i18nPageMeta(lang, "terms", undefined, m.legal.termsTitle, "Hilal kullanım koşulları: yalnızca 18 yaş ve üzeri, profil yayın kuralları, yasaklı içerik ve hesap/profil kaldırma süreçleri.");
  // Hukuki metin yalnızca Türkçedir: diğer dillerdeki kopyalar Türkçe aslına canonical verir ve indekslenmez.
  return lang === "tr" ? meta : { ...meta, alternates: { ...meta.alternates, canonical: localizedPath("tr", "terms") }, robots: { index: false, follow: true } };
}

export default async function TermsPage() {
  const { lang, m } = await getI18n();
  return (
    <ProsePage eyebrow={m.footer.legal} title={m.legal.termsTitle} path={localizedPath(lang, "terms")} notice={<LegalDraftNotice />} contentLang="tr">
      <h2>Hizmetin kapsamı</h2>
      <p>Hilal, yetişkinlerin ortak ilgi alanları üzerinden sosyal tanışmasına yönelik bir profil keşif platformudur. Platform, ücretli cinsel hizmet tanıtımı, aracılık veya müşteri yönlendirme amacıyla kullanılamaz.</p>
      <h2>Profiller</h2>
      <p>Profiller yalnızca yönetim tarafından, profil sahibinin açık yayın yetkilendirmesi, yaş doğrulaması ve fotoğraf kullanım izni alındıktan sonra oluşturulur. Profil sahibi yetkilendirmesini dilediği zaman geri alabilir; bu durumda profil derhal yayından kaldırılır.</p>
      <h2>Üyelik paketleri</h2>
      <p>Görünürlük paketleri yalnızca hukuka uygun sosyal tanışma faaliyetleri içindir. Sponsorlu profiller açıkça etiketlenir. Şu anda platform üzerinden ödeme alınmamaktadır.</p>
      <h2>Yer sağlayıcı sıfatı</h2>
      <p>[5651 sayılı Kanun kapsamında yer sağlayıcı/içerik sağlayıcı nitelendirmesi ve bildirim-kaldırma süreci hukuk incelemesi ile belirlenecektir.]</p>
    </ProsePage>
  );
}
