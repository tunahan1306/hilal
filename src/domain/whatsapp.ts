/** Only Turkish mobile numbers; URLs and arbitrary redirect targets are never accepted. */
export function normalizeWhatsAppPhone(value: string): string | null {
  if (!/^[+\d\s()-]*$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (/^05\d{9}$/.test(digits)) digits = `9${digits}`;
  else if (/^5\d{9}$/.test(digits)) digits = `90${digits}`;
  return /^905\d{9}$/.test(digits) ? digits : null;
}
export function whatsAppHref(phone: string | null | undefined): string | null {
  const normalized = phone ? normalizeWhatsAppPhone(phone) : null;
  return normalized ? `https://wa.me/${normalized}` : null;
}
