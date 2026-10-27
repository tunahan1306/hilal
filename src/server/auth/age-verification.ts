import "server-only";

/**
 * Yaş doğrulama sağlayıcı soyutlaması — İLK SÜRÜMDE UYGULANMAZ (payments.ts ile aynı duruş).
 *
 * Uygulama ham kimlik belgesi veya biyometrik veri hiçbir zaman almaz/saklamaz: yalnızca
 * sağlayıcının oturum referansını (providerSessionRef) alır ve sunucu tarafında bu arayüzün
 * bir uygulamasıyla sağlayıcıdan sonuç (approved/rejected) alır. Gerçek bir sağlayıcı
 * (ör. Yoti, Ondato — bkz. docs/research/COMPETITORS.md) sözleşme/entegrasyon onayı
 * olmadan eklenmez; uydurma bir "onaylandı" sonucu asla üretilmez.
 */
export interface AgeVerificationProvider {
  readonly name: string;
  verifySession(providerSessionRef: string): Promise<{ status: "approved" | "rejected"; providerRef: string; expiresAt?: string }>;
}

export class AgeVerificationDisabledError extends Error {
  constructor() {
    super("Yaş doğrulama sağlayıcısı etkin değil. Sağlayıcı seçimi ve entegrasyon onayı gerekli.");
  }
}

export function getAgeVerificationProvider(): AgeVerificationProvider {
  throw new AgeVerificationDisabledError();
}
