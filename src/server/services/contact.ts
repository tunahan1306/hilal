import "server-only";
import { createHash } from "node:crypto";
import { contactMessageSchema } from "@/domain/schemas";
import { CONTACT_CATEGORY_LABELS, type Admin, type ContactMessage, type ContactStatus } from "@/domain/types";
import { siteUrl } from "@/lib/site";
import { getRepository } from "../repositories";
import { rateLimit } from "../rate-limit";
import { audit } from "./audit";
import { DomainError, RateLimitedError } from "./errors";

/** Aynı ziyaretçiden saatte en fazla bu kadar mesaj (veritabanı sayacı; instance'lar arası geçerli). */
export const CONTACT_MESSAGES_PER_HOUR = 5;
/** Formun açılmasından gönderime kadar geçmesi gereken en kısa süre (bot süzgeci). */
export const CONTACT_MIN_FILL_MS = 2_000;

export class SpamRejectedError extends DomainError {
  constructor() {
    super("Mesajınız gönderilemedi. Lütfen sayfayı yenileyip tekrar deneyin.", "spam");
  }
}

export async function submitContactMessage(raw: unknown, fingerprint: string, now = Date.now()): Promise<ContactMessage> {
  const input = contactMessageSchema.parse(raw);
  if (input.website) throw new SpamRejectedError();
  if (input.startedAt !== undefined && now - input.startedAt < CONTACT_MIN_FILL_MS) throw new SpamRejectedError();

  // 1) Süreç içi hızlı sınır, 2) veritabanı tabanlı saatlik sınır (sunucusuz ortamda paylaşılır).
  if (!rateLimit(`contact:${fingerprint}`, 3, 600_000, now).ok) throw new RateLimitedError();
  const digest = createHash("sha256").update(`${input.email}\n${input.subject}\n${input.message}`).digest("hex").slice(0, 24);
  if (!rateLimit(`contact-dup:${fingerprint}:${digest}`, 1, 600_000, now).ok) {
    throw new DomainError("Bu mesaj az önce alındı. Aynı mesajı tekrar göndermenize gerek yok.", "duplicate");
  }
  const repo = getRepository();
  const since = new Date(now - 3_600_000).toISOString();
  if ((await repo.countContactMessagesSince(fingerprint, since)) >= CONTACT_MESSAGES_PER_HOUR) throw new RateLimitedError();

  const message = await repo.createContactMessage({
    category: input.category,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    ipHash: fingerprint,
  });
  await audit(null, "contact_message.create", "contact_message", message.id, { category: message.category });
  await notifyNewContactMessage(message).catch((e) => console.error("contact notification failed", e));
  return message;
}

export type ContactNotificationConfig = { apiKey: string; to: string; from: string };

/** E-posta bildirimi yalnızca üç değişken de tanımlıysa etkin olur; aksi halde gönderim yapılmaz. */
export function contactNotificationConfig(env: NodeJS.ProcessEnv = process.env): ContactNotificationConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.CONTACT_NOTIFY_TO?.trim();
  const from = env.CONTACT_NOTIFY_FROM?.trim();
  return apiKey && to && from ? { apiKey, to, from } : null;
}

/**
 * Yöneticilere yeni mesaj bildirimi (Resend HTTP API). Veri minimizasyonu: e-postada
 * gönderenin adı, adresi ve mesaj metni yer almaz; yalnızca kategori ve panel bağlantısı.
 */
async function notifyNewContactMessage(message: ContactMessage): Promise<boolean> {
  const config = contactNotificationConfig();
  if (!config) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: `Yeni iletişim talebi: ${CONTACT_CATEGORY_LABELS[message.category]}`,
      text: `Yeni bir iletişim talebi alındı (${CONTACT_CATEGORY_LABELS[message.category]}).\n\nYönetim panelinde görüntüleyin: ${siteUrl()}/admin/iletisim/${message.id}`,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}

/** Detay ilk kez açıldığında okundu olarak işaretlenir. */
export async function openContactMessage(actor: Admin, id: string): Promise<ContactMessage | null> {
  const repo = getRepository();
  const message = await repo.getContactMessage(id);
  if (!message || message.readAt) return message;
  const updated = await repo.updateContactMessage(id, { readAt: new Date().toISOString() });
  await audit(actor, "contact_message.read", "contact_message", id);
  return updated;
}

export async function markContactMessageUnread(actor: Admin, id: string): Promise<ContactMessage> {
  const updated = await getRepository().updateContactMessage(id, { readAt: null });
  await audit(actor, "contact_message.unread", "contact_message", id);
  return updated;
}

export async function updateContactMessageStatus(actor: Admin, id: string, status: ContactStatus): Promise<ContactMessage> {
  const repo = getRepository();
  const current = await repo.getContactMessage(id);
  if (!current) throw new DomainError("Mesaj bulunamadı.", "not_found");
  const updated = await repo.updateContactMessage(id, { status, readAt: current.readAt ?? new Date().toISOString() });
  await audit(actor, "contact_message.status", "contact_message", id, { from: current.status, to: status });
  return updated;
}
