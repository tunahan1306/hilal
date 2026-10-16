export type DiscoveryCursor = { publishedAt: string; id: string };
export function encodeCursor(value: DiscoveryCursor): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function decodeCursor(raw: string): DiscoveryCursor | null {
  if (raw.length > 512) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id) || typeof value.publishedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value.publishedAt) || !Number.isFinite(Date.parse(value.publishedAt))) return null;
    return { id: value.id, publishedAt: value.publishedAt };
  } catch { return null; }
}
