import "server-only";

/** Supabase yapılandırılmamışsa uygulama sentetik verilerle "demo" modunda çalışır. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

/**
 * Production'da demo modu yalnızca açıkça izin verilirse çalışır; böylece
 * yanlış yapılandırılmış bir canlı ortam sessizce sahte verilerle açılmaz.
 */
export function assertDemoAllowed(): void {
  if (isDemoMode() && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_MODE !== "true") {
    throw new Error(
      "Supabase yapılandırması eksik. Production'da demo modu için ALLOW_DEMO_MODE=true ayarlanmalı.",
    );
  }
}

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Sır değeri. Production'da (demo modu dahil) en az 32 karakterlik açık bir
 * değer zorunludur; geliştirme varsayılanları yalnızca development/test içindir.
 * Aksi halde bilinen bir varsayılanla imzalanmış oturum çerezleri sahtelenebilir.
 */
export function requiredSecret(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length >= 32) return v;
  if (isProduction()) throw new Error(`${name} production'da zorunludur (en az 32 karakter)`);
  return devFallback;
}

/** Production yapılandırma hataları (sunucu açılışında `instrumentation.ts` ile kontrol edilir). */
export function productionConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const errors: string[] = [];
  const long = (k: string, min = 32) => (env[k]?.length ?? 0) >= min;
  const supabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
  if (!long("IP_HASH_SALT")) errors.push("IP_HASH_SALT (≥32 karakter)");
  if (!supabase) {
    if (env.ALLOW_DEMO_MODE !== "true") errors.push("Supabase değişkenleri veya ALLOW_DEMO_MODE=true");
    else {
      if (!long("SESSION_SECRET")) errors.push("SESSION_SECRET (≥32 karakter, demo modu)");
      if (!long("DEMO_ADMIN_PASSWORD", 12)) errors.push("DEMO_ADMIN_PASSWORD (≥12 karakter, demo modu)");
      if (!long("DEMO_ADMIN_TOTP_SECRET", 16)) errors.push("DEMO_ADMIN_TOTP_SECRET (Base32, demo modu)");
    }
  }
  return errors;
}
