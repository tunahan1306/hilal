/**
 * Medya depolama sözleşmesi.
 *
 * İki alan vardır:
 * - private: yüklenen orijinaller ve işlenmiş dosyalar (yalnızca sunucu ve
 *   kısa ömürlü imzalı adreslerle yönetim önizlemesi).
 * - public: yalnızca "onaylı medya + yayındaki profil" için kopyalanan dosyalar.
 *   Profil yayından kalkınca veya medya reddedilince kopyalar silinir.
 */
export type UploadTarget = {
  /** Tarayıcının dosyayı PUT ile göndereceği adres (imzalı, kısa ömürlü) */
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};

export interface MediaStorage {
  readonly kind: "supabase" | "memory";
  createUploadTarget(path: string, contentType: string, maxBytes: number): Promise<UploadTarget>;
  readPrivate(path: string): Promise<Buffer | null>;
  writePrivate(path: string, data: Buffer, contentType: string): Promise<void>;
  removePrivate(paths: string[]): Promise<void>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
  /** Özel dosyayı herkese açık alana kopyalar; tahmin edilemez bir yol üretir. */
  publish(privatePath: string, contentType: string): Promise<{ publicPath: string; url: string }>;
  unpublish(publicPaths: string[]): Promise<void>;
}
