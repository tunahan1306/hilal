import "server-only";

/**
 * Ödeme soyutlaması — İLK SÜRÜMDE UYGULANMAZ.
 *
 * Gerçek tahsilat, (1) hukuki inceleme, (2) lisanslı bir ödeme kuruluşunun
 * (6493 sayılı Kanun kapsamında) iş modelini onaylaması ve (3) mesafeli satış /
 * tüketici mevzuatı metinlerinin hazırlanmasından sonra bu arayüzün bir
 * uygulamasıyla eklenecektir. Kayıt dışı, gizli veya denetimi atlatan ödeme
 * yöntemleri hiçbir koşulda eklenmez.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: { subscriptionId: string; amountTry: number; customerEmail: string }): Promise<{ redirectUrl: string; externalRef: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<{ externalRef: string; status: "paid" | "failed" | "refunded" }>;
  refund(externalRef: string, amountTry?: number): Promise<void>;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Ödeme entegrasyonu etkin değil. Hukuki inceleme ve ödeme kuruluşu onayı gerekli.");
  }
}

export function getPaymentProvider(): PaymentProvider {
  throw new PaymentsDisabledError();
}
