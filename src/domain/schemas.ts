import { z } from "zod";
import { normalizeWhatsAppPhone } from "./whatsapp";
import { isAdult } from "./age";
import { docFromPlainText, parseRichDoc } from "./rich-text";
import {
  CONSENT_TYPES,
  PRIVACY_REQUEST_TYPES,
  REPORT_CATEGORIES,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
} from "./types";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} en az ${min} karakter olmalı`)
    .max(max, `${label} en fazla ${max} karakter olabilir`);

const noHtml = (s: string) => !/[<>]/.test(s);

export const profileInputSchema = z.object({
  nickname: trimmed(2, 40, "Takma ad")
    .refine(noHtml, "HTML karakterleri kullanılamaz")
    .refine((s) => /^[\p{L}\p{N} ._'-]+$/u.test(s), "Takma ad yalnızca harf, rakam ve boşluk içerebilir"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG formatında olmalı")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Geçersiz tarih")
    .refine((d) => isAdult(d, new Date()), "Profil sahibi 18 yaşından büyük olmalı"),
  provincePlate: z.coerce.number().int().min(1, "İl seçin").max(81),
  districtSlug: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .transform((v) => (v ? v : null)),
  /** Zengin biyografi (Tiptap JSON). Verilmezse düz `bio` metninden üretilir. */
  bioDoc: z.unknown().optional(),
  whatsappPhone: z.string().max(40).refine((v) => !v.trim() || Boolean(normalizeWhatsAppPhone(v)), "Geçerli bir Türkiye cep telefonu numarası girin").optional(),
  whatsappConsent: z.boolean().optional(),
  bio: z.string().trim().max(20_000).optional(),
  interestIds: z.array(z.string().min(1)).max(8, "En fazla 8 ilgi alanı seçilebilir").default([]),
  seoTitle: z.string().trim().max(70).optional().transform((v) => v || null),
  seoDescription: z.string().trim().max(160).optional().transform((v) => v || null),
  noindex: z.boolean().default(false),
}).transform((v, ctx) => {
  if (v.whatsappConsent && !normalizeWhatsAppPhone(v.whatsappPhone ?? "")) {
    ctx.addIssue({ code: "custom", path: ["whatsappPhone"], message: "Paylaşım izni için geçerli numara gerekli" });
    return z.NEVER;
  }
  // Biyografi: HTML yok; katı JSON şeması + yapısal sınırlar (bkz. domain/rich-text.ts)
  const parsed = v.bioDoc != null && v.bioDoc !== "" ? parseRichDoc(v.bioDoc) : null;
  if (parsed && !parsed.ok) {
    ctx.addIssue({ code: "custom", path: ["bio"], message: parsed.error });
    return z.NEVER;
  }
  const doc = parsed?.ok ? parsed.doc : docFromPlainText(v.bio ?? "");
  const plain = parsed?.ok ? parsed.plainText : (v.bio ?? "").trim();
  if (plain.length < 20) {
    ctx.addIssue({ code: "custom", path: ["bio"], message: "Biyografi en az 20 karakter olmalı" });
    return z.NEVER;
  }
  if (/[<>]/.test(plain) && !parsed) {
    ctx.addIssue({ code: "custom", path: ["bio"], message: "HTML karakterleri kullanılamaz" });
    return z.NEVER;
  }
  const { bioDoc: _drop, ...rest } = v;
  void _drop;
  return { ...rest, bio: plain, bioDoc: doc };
});
export type ProfileInput = z.output<typeof profileInputSchema>;
export type ProfileFormInput = z.input<typeof profileInputSchema>;

export const reportInputSchema = z.object({
  profileId: z.string().min(1),
  category: z.enum(REPORT_CATEGORIES, { message: "Kategori seçin" }),
  description: trimmed(10, 1000, "Açıklama").refine(noHtml, "HTML karakterleri kullanılamaz"),
  reporterEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null)
    .pipe(z.email("Geçerli bir e-posta girin").nullable()),
  // Bot tuzağı: görünmez alan dolu ise istek reddedilir.
  website: z.string().max(0).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const privacyRequestSchema = z.object({
  type: z.enum(PRIVACY_REQUEST_TYPES),
  profileUrl: z.string().trim().max(300).optional().transform((v) => v || null),
  requesterName: trimmed(2, 120, "Ad soyad").refine(noHtml),
  requesterEmail: z.email("Geçerli bir e-posta girin").max(200),
  relation: z.enum(["self", "representative", "other"]),
  details: trimmed(10, 2000, "Açıklama").refine(noHtml, "HTML karakterleri kullanılamaz"),
  acknowledge: z.literal(true, { message: "Aydınlatma metnini okuduğunuzu onaylayın" }),
  website: z.string().max(0).optional(),
});
export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;

export const consentInputSchema = z.object({
  type: z.enum(CONSENT_TYPES),
  method: trimmed(3, 200, "Yöntem"),
});

export const verificationInputSchema = z.object({
  type: z.enum(VERIFICATION_TYPES),
  status: z.enum(VERIFICATION_STATUSES),
  method: trimmed(3, 200, "Yöntem"),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter").max(200),
  totp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6 haneli doğrulama kodu girin")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const subscriptionInputSchema = z.object({
  profileId: z.string().min(1),
  planId: z.string().min(1),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  months: z.coerce.number().int().min(1).max(24),
  autoRenew: z.boolean().default(false),
  sponsored: z.boolean().default(false),
  note: z.string().trim().max(300).optional().transform((v) => v || null),
});

export const seoPageInputSchema = z.object({
  path: z.string().regex(/^\/[a-z0-9\-/]*$/, "Geçersiz yol"),
  title: z.string().trim().max(70).optional().transform((v) => v || null),
  description: z.string().trim().max(160).optional().transform((v) => v || null),
  canonical: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || v.startsWith("/") || /^https:\/\//.test(v), "Canonical / veya https:// ile başlamalı"),
  indexOverride: z.enum(["auto", "index", "noindex"]).transform((v) => (v === "auto" ? null : v === "index")),
  intro: z.string().trim().max(2000).optional().transform((v) => v || null).refine((v) => v === null || !/[<>]/.test(v)),
});
