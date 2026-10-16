import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = {
  title: "KVKK aydınlatma metni",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
  alternates: { canonical: "/kvkk" },
};

export default function KvkkPage() {
  return (
    <ProsePage eyebrow="Yasal" title="KVKK aydınlatma metni" path="/kvkk" notice={<LegalDraftNotice />}>
      <h2>Veri sorumlusu</h2>
      <p>[Şirket unvanı, MERSİS no, adres ve VERBİS kayıt bilgileri hukuk incelemesi sonrasında eklenecektir.]</p>
      <h2>İşlenen kişisel veriler</h2>
      <ul>
        <li><strong>Profil sahipleri:</strong> takma ad, doğum tarihi (yalnızca yaş doğrulaması için; kamuya yaş olarak yansır), il/ilçe, biyografi, isteğe bağlı WhatsApp numarası ve paylaşım izni tarihi, ilgi alanları, fotoğraflar, rıza ve doğrulama kayıtları.</li>
        <li><strong>Ziyaretçiler:</strong> şikâyet ve başvuru formlarında paylaşılan bilgiler; kötüye kullanımı önlemek için IP adresinin geri döndürülemez özeti (ham IP saklanmaz).</li>
        <li><strong>Yöneticiler:</strong> e-posta, oturum ve işlem kayıtları.</li>
      </ul>
      <h2>İşleme amaçları ve hukuki sebepler</h2>
      <p>Profillerin yayınlanması açık rızaya; yaş doğrulaması, şikâyet yönetimi ve 5651 sayılı Kanun kapsamındaki yükümlülükler hukuki yükümlülük ve meşru menfaate dayanır. [Hukuki sebeplerin m.5 ve m.6 kapsamında kesinleştirilmesi gerekir.]</p>
      <h2>Saklama süreleri</h2>
      <ul>
        <li>Yaş/kimlik doğrulama belgeleri: doğrulamadan sonra en fazla 30 gün (yapılandırılabilir), ardından otomatik silinir; yalnızca doğrulama sonucu saklanır.</li>
        <li>Profil verileri: rızanın geri alınmasına veya silme talebine kadar.</li>
        <li>Denetim kayıtları: [süre hukuk incelemesi ile belirlenecek].</li>
      </ul>
      <h2>Haklarınız (KVKK m.11)</h2>
      <p>Verilerinize erişme, düzeltme, silme, işlemeye itiraz etme ve diğer haklarınızı <Link href="/kaldirma-talebi" className="text-brand underline underline-offset-4">başvuru formu</Link> ile kullanabilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.</p>
      <h2>Yurt dışına aktarım</h2>
      <p>Altyapı sağlayıcılarımızın (barındırma, veritabanı) sunucuları yurt dışında bulunabilir. [KVKK m.9 kapsamındaki aktarım dayanağı hukuk incelemesi ile belirlenmelidir.]</p>
    </ProsePage>
  );
}
