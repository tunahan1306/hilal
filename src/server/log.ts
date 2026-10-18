import "server-only";

/**
 * Sunucu hatalarını kişisel veri sızdırmadan kaydeder: yalnızca hata adı, kodu ve
 * kısaltılmış mesaj. Ham hata nesnesi (istek gövdesi, `details`, satır değerleri)
 * loglara yazılmaz.
 */
export function logError(scope: string, e: unknown): void {
  const err = e as { name?: unknown; code?: unknown; message?: unknown } | null;
  const name = typeof err?.name === "string" ? err.name : typeof e;
  const code = typeof err?.code === "string" ? err.code : undefined;
  const message = typeof err?.message === "string" ? redact(err.message).slice(0, 200) : undefined;
  console.error(JSON.stringify({ level: "error", scope, name, code, message }));
}

/** E-posta adreslerini ve uzun rakam dizilerini (telefon vb.) maskeler. */
export function redact(text: string): string {
  return text.replace(/[^\s@"'<>()]+@[^\s@"'<>()]+\.[a-z]{2,}/gi, "[e-posta]").replace(/\+?\d[\d\s-]{8,}\d/g, "[numara]");
}
