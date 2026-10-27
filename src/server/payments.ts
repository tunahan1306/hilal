import "server-only";

/**
 * Ödeme soyutlaması — İLK SÜRÜMDE UYGULANMAZ.
 *
 * Gerçek tahsilat, (1) hukuki inceleme, (2) lisanslı bir ödeme kuruluşunun
 * (6493 sayılı Kanun kapsamında) iş modelini onaylaması ve (3) mesafeli satış /
 * tüketici mevzuatı metinlerinin hazırlanmasından sonra bu arayüzün bir
 * uygulamasıyla eklenecektir. Kayıt dışı, gizli veya denetimi atlatan ödeme
 * yöntemleri hiçbir koşulda eklenmez.
 *
 * Modül F (bkz. docs/transformation/02c_MODULE_ARCHITECTURE.md §4) bu arayüzü
 * creator ekonomisi için initiatePayout/chargeOneOff ile genişletir ve
 * para birimi/idempotency alanlarını ekler — SADECE arayüz şekli; getPaymentProvider()
 * bu genişlemeden sonra da HER ZAMAN PaymentsDisabledError fırlatır. 02c'nin önerdiği
 * "MockPaymentProvider" (yerel/demo modunda sahte de olsa gerçek bir "ödeme tamamlandı"
 * durumuna geçen bir uygulama) KASITLI OLARAK burada YOKTUR: bu, hiçbir lisans/hukuki
 * onay olmadan çalışan bir ödeme akışı sunmak anlamına gelir ki bu, yukarıdaki kuralın
 * (kayıt dışı/denetimsiz ödeme asla eklenmez) tam karşılığı olurdu. Yaş doğrulamasında
 * (age-verification.ts) ve creator aboneliğinde (services/creator.ts subscribeToTier)
 * izlenen duruşla birebir aynı: sağlayıcı seçilip sözleşme imzalanana kadar hiçbir satır
 * gerçek bir satın almayla oluşamaz.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    referenceId: string;
    amountMinorUnits: number;
    currency: string;
    customerEmail: string;
    /** Çağıran tarafından üretilir ve sağlayıcı çağrısından ÖNCE kaydedilir; bir Server
     * Action'ın çökme sonrası tekrar denenmesi asla çift tahsilat yapmaz. */
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string; externalRef: string }>;

  verifyWebhook(rawBody: string, signature: string): Promise<{
    externalRef: string;
    /** "chargeback" iadeden (refunded) ayrı bir olaydır — dört sağlayıcı da (bkz.
     * docs/payments/PROVIDER_COMPARISON.md) bunu müşteri kaynaklı iadeden farklı
     * raporlar; defterde de ayrı bir durum olarak tutulur (bkz. domain/billing.ts). */
    status: "paid" | "failed" | "refunded" | "chargeback";
    /** Sağlayıcı bunu olduğu gibi geri yansıtır; servis katmanı externalRef değil bu alan üzerinden upsert eder. */
    idempotencyKey: string;
  }>;

  refund(externalRef: string, amountMinorUnits?: number): Promise<void>;

  /** Creator payout (Modül C/F). */
  initiatePayout(input: {
    payeeId: string;
    amountMinorUnits: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ externalRef: string; status: "initiated" | "paid" | "failed" }>;

  /** Tek seferlik ücret (bahşiş/PPV) — createCheckout'un abonelik çerçevesinden AYRI. */
  chargeOneOff(input: {
    referenceId: string;
    amountMinorUnits: number;
    currency: string;
    customerEmail: string;
    idempotencyKey: string;
  }): Promise<{ externalRef: string; status: "succeeded" | "failed" }>;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Ödeme entegrasyonu etkin değil. Hukuki inceleme ve ödeme kuruluşu onayı gerekli.");
  }
}

export function getPaymentProvider(): PaymentProvider {
  throw new PaymentsDisabledError();
}
