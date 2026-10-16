/**
 * Sunucu açılışında production yapılandırmasını doğrular: eksik veya zayıf
 * sırlarla (ör. bilinen geliştirme varsayılanları) çalışmaya başlamaz.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  // Build sırasında (sayfa üretimi) değil, yalnızca çalışan sunucuda zorunlu.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { productionConfigErrors } = await import("./server/env");
  const errors = productionConfigErrors();
  if (errors.length) {
    throw new Error(`Eksik/zayıf production yapılandırması: ${errors.join(", ")}`);
  }
}
