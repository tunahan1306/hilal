import type { Metadata } from "next";
import { LegalDraftNotice, ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = {
  title: "Kullanım koşulları",
  alternates: { canonical: "/kullanim-kosullari" },
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Yasal" title="Kullanım koşulları" path="/kullanim-kosullari" notice={<LegalDraftNotice />}>
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
