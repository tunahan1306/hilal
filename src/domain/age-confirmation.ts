/** A visitor declaration is never identity or documentary age verification. */
export const AGE_COOKIE = "hilal_adult";
export const AGE_COOKIE_VALUE = "declared-v1";
export const AGE_MAX_AGE = 60 * 60 * 24 * 30;
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  const path = value.split("?")[0];
  return path === "/" || path === "/kesfet" || path.startsWith("/sehir/") || path.startsWith("/profil/") ? value : "/";
}
