/**
 * Zengin biyografi belgesi — Tiptap/ProseMirror JSON'unun KATI bir alt kümesi.
 *
 * Güvenlik modeli: HTML hiçbir aşamada saklanmaz veya render edilmez. Belge
 * yazılırken bu şemayla doğrulanır (bilinmeyen düğüm/işaret → red), okunurken
 * kendi React render'ımızla basılır. Bu yüzden HTML temizleyiciye (sanitizer)
 * gerek yoktur ve script/stil enjeksiyonu yapısal olarak mümkün değildir.
 */
import { z } from "zod";

export const RICH_TEXT_LIMITS = {
  maxChars: 20_000,
  maxNodes: 4_000,
  maxDepth: 8,
  maxLinks: 20,
  maxHrefLength: 500,
} as const;

const textMark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z
    .object({
      type: z.literal("link"),
      attrs: z
        .object({
          href: z.string().max(RICH_TEXT_LIMITS.maxHrefLength),
          // Tiptap'ın eklediği zararsız alanlar kabul edilir ama render'da kullanılmaz
          target: z.string().nullable().optional(),
          rel: z.string().nullable().optional(),
          class: z.string().nullable().optional(),
        })
        .strict(),
    })
    .strict(),
]);

export type RichMark = z.infer<typeof textMark>;
export type RichText = { type: "text"; text: string; marks?: RichMark[] };
export type RichInline = RichText | { type: "hardBreak" };
export type RichBlock =
  | { type: "paragraph"; content?: RichInline[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: RichInline[] }
  | { type: "blockquote"; content: RichBlock[] }
  | { type: "bulletList"; content: RichListItem[] }
  | { type: "orderedList"; attrs?: { start?: number; type?: string | null }; content: RichListItem[] }
  | { type: "horizontalRule" };
export type RichListItem = { type: "listItem"; content: RichBlock[] };
export type RichDoc = { type: "doc"; content: RichBlock[] };

const textNode: z.ZodType<RichText> = z
  .object({ type: z.literal("text"), text: z.string().min(1).max(RICH_TEXT_LIMITS.maxChars), marks: z.array(textMark).max(3).optional() })
  .strict();
const inline: z.ZodType<RichInline> = z.union([textNode, z.object({ type: z.literal("hardBreak") }).strict()]);
const inlineContent = z.array(inline).max(2_000).optional();

const block: z.ZodType<RichBlock> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("paragraph"), attrs: z.object({ textAlign: z.null().optional() }).strict().optional(), content: inlineContent }).strict().transform(({ type, content }) => ({ type, content })),
    z
      .object({ type: z.literal("heading"), attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]), textAlign: z.null().optional() }).strict(), content: inlineContent })
      .strict()
      .transform(({ type, attrs, content }) => ({ type, attrs: { level: attrs.level }, content })),
    z.object({ type: z.literal("blockquote"), content: z.array(block).min(1).max(200) }).strict(),
    z.object({ type: z.literal("bulletList"), content: z.array(listItem).min(1).max(200) }).strict(),
    z
      .object({ type: z.literal("orderedList"), attrs: z.object({ start: z.number().int().min(1).max(10_000).optional(), type: z.string().nullable().optional() }).strict().optional(), content: z.array(listItem).min(1).max(200) })
      .strict(),
    z.object({ type: z.literal("horizontalRule") }).strict(),
  ]),
) as z.ZodType<RichBlock>;
const listItem: z.ZodType<RichListItem> = z.lazy(() => z.object({ type: z.literal("listItem"), content: z.array(block).min(1).max(50) }).strict());

export const richDocSchema: z.ZodType<RichDoc> = z.object({ type: z.literal("doc"), content: z.array(block).max(2_000) }).strict();

/** Bağlantı adresi güvenli mi? Yalnızca https:// veya site içi yol (/...). */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return /^\/[\w\-./?=&%#]*$/.test(href);
  try {
    const u = new URL(href);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

function walk(doc: RichDoc, visit: (node: RichBlock | RichListItem | RichInline, depth: number) => void) {
  const rec = (nodes: (RichBlock | RichListItem | RichInline)[] | undefined, depth: number) => {
    for (const n of nodes ?? []) {
      visit(n, depth);
      if ("content" in n && Array.isArray(n.content)) rec(n.content as (RichBlock | RichListItem | RichInline)[], depth + 1);
    }
  };
  rec(doc.content, 1);
}

export function linksOf(doc: RichDoc): string[] {
  const hrefs: string[] = [];
  walk(doc, (n) => {
    if (n.type === "text") for (const m of n.marks ?? []) if (m.type === "link") hrefs.push(m.attrs.href);
  });
  return hrefs;
}

/** Düz metin: bloklar arası boş satır, liste öğeleri madde işaretiyle. */
export function docToPlainText(doc: RichDoc): string {
  const out: string[] = [];
  const inlineText = (c?: RichInline[]) => (c ?? []).map((i) => (i.type === "text" ? i.text : "\n")).join("");
  const blockText = (b: RichBlock | RichListItem, prefix = ""): string => {
    switch (b.type) {
      case "paragraph":
      case "heading":
        return prefix + inlineText(b.content);
      case "blockquote":
        return b.content.map((x) => blockText(x)).join("\n");
      case "bulletList":
      case "orderedList":
        return b.content.map((li, i) => blockText(li, b.type === "bulletList" ? "• " : `${(b.attrs?.start ?? 1) + i}. `)).join("\n");
      case "listItem":
        return b.content.map((x, i) => blockText(x, i === 0 ? prefix : "")).join("\n");
      case "horizontalRule":
        return "";
    }
  };
  for (const b of doc.content) {
    const t = blockText(b).trim();
    if (t) out.push(t);
  }
  return out.join("\n\n");
}

export type RichDocResult = { ok: true; doc: RichDoc; plainText: string } | { ok: false; error: string };

/** Yazma yolunda tek giriş noktası: şema + yapısal sınırlar + bağlantı güvenliği. */
export function parseRichDoc(input: unknown): RichDocResult {
  let raw = input;
  if (typeof raw === "string") {
    if (raw.length > 400_000) return { ok: false, error: "Biyografi belgesi çok büyük" };
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Biyografi belgesi okunamadı" };
    }
  }
  const parsed = richDocSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Biyografi izin verilmeyen biçimlendirme içeriyor" };
  const doc = parsed.data;
  let nodes = 0;
  let maxDepth = 0;
  walk(doc, (_, depth) => {
    nodes++;
    maxDepth = Math.max(maxDepth, depth);
  });
  if (nodes > RICH_TEXT_LIMITS.maxNodes) return { ok: false, error: "Biyografi çok fazla öğe içeriyor" };
  if (maxDepth > RICH_TEXT_LIMITS.maxDepth) return { ok: false, error: "Biyografi çok derin iç içe yapı içeriyor" };
  const links = linksOf(doc);
  if (links.length > RICH_TEXT_LIMITS.maxLinks) return { ok: false, error: `En fazla ${RICH_TEXT_LIMITS.maxLinks} bağlantı eklenebilir` };
  if (links.some((h) => !isSafeHref(h))) return { ok: false, error: "Bağlantılar yalnızca https:// veya site içi adres olabilir" };
  const plainText = docToPlainText(doc);
  if (plainText.length > RICH_TEXT_LIMITS.maxChars) return { ok: false, error: `Biyografi en fazla ${RICH_TEXT_LIMITS.maxChars.toLocaleString("tr-TR")} karakter olabilir` };
  return { ok: true, doc, plainText };
}

/** Düz metinden basit belge (eski kayıtlar ve demo verisi için). */
export function docFromPlainText(text: string): RichDoc {
  return {
    type: "doc",
    content: text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}

/** Harici bağlantı izin listesi (ör. "example.org,muze.gov.tr"); boşsa hiçbir harici alan yayınlanamaz. */
export function externalLinkHosts(doc: RichDoc): string[] {
  return linksOf(doc)
    .filter((h) => !h.startsWith("/"))
    .map((h) => new URL(h).hostname.toLowerCase());
}
