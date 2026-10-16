import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/site/prose-page";
import { REPORT_CATEGORY_LABELS } from "@/domain/types";

export const metadata: Metadata = {
  title: "Güvenlik ve topluluk kuralları",
  description: "Hilal topluluk kuralları: yalnızca 18 yaş üstü, rızası alınmış profiller; ücretli hizmet tanıtımı, taciz ve izinsiz fotoğraf yasaktır.",
  alternates: { canonical: "/guvenlik" },
};

export default function SafetyPage() {
  return (
    <ProsePage title="Güvenlik ve topluluk kuralları" path="/guvenlik" lead="Hilal, yetişkinlerin ortak ilgi alanları üzerinden sosyal çevre edinmesi için tasarlanmıştır.">
      <h2>Kimler yer alabilir?</h2>
      <ul>
        <li>Yalnızca 18 yaşını doldurmuş ve yaşı belge ile doğrulanmış kişiler.</li>
        <li>Yalnızca yayın için açık ve yazılı yetkilendirme vermiş kişiler. Profiller yönetim tarafından oluşturulur.</li>
        <li>Yalnızca kullanım hakkı doğrulanmış fotoğraflar.</li>
      </ul>
      <h2>Kesinlikle yasak olanlar</h2>
      <ul>
        <li>Ücretli cinsel hizmet tanıtımı, fuhşa aracılık, müşteri yönlendirme veya bunları çağrıştıran ifadeler.</li>
        <li>Fiyat, ücret, &quot;rezervasyon&quot; veya benzeri ticari teklif içeren içerikler.</li>
        <li>Telefon, e-posta, mesajlaşma uygulaması veya sosyal medya gibi kişisel iletişim bilgileri.</li>
        <li>Başkasına ait fotoğraf kullanımı ve kimlik taklidi.</li>
        <li>Taciz, tehdit, nefret söylemi ve ayrımcılık.</li>
      </ul>
      <h2>Bu kurallar nasıl uygulanır?</h2>
      <p>
        Her profil yayından önce otomatik içerik taramasından ve insan moderasyonundan geçer. Yasaklı ifadeler veya iletişim bilgisi içeren profiller
        yayınlanamaz. Yayındaki bir profilin içeriği değiştiğinde profil yeniden incelemeye alınır.
      </p>
      <h2>Şikâyet kategorileri</h2>
      <ul>
        {Object.values(REPORT_CATEGORY_LABELS).map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p>
        Reşit olmayan kişi şüphesi, ücretli hizmet tanıtımı, izinsiz fotoğraf ve kimlik taklidi bildirimlerinde ilgili profil inceleme tamamlanana kadar
        otomatik olarak yayından kaldırılır. Tüm kararlar kayıt altına alınır ve itiraz edilebilir.
      </p>
      <h2>Kendinizi koruyun</h2>
      <ul>
        <li>Hiç kimseye para veya ön ödeme göndermeyin.</li>
        <li>İlk buluşmalarınızı kalabalık, herkese açık yerlerde yapın ve bir yakınınızı bilgilendirin.</li>
        <li>Acil bir durumda 112&apos;yi arayın.</li>
      </ul>
      <h2>Profil kaldırma</h2>
      <p>
        Profilinizin kaldırılmasını istiyorsanız <Link href="/kaldirma-talebi" className="text-brand underline underline-offset-4">kaldırma başvuru formunu</Link> kullanabilirsiniz.
      </p>
    </ProsePage>
  );
}
