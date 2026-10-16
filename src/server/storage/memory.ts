import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { requiredSecret } from "../env";
import type { MediaStorage, UploadTarget } from "./types";

/** Demo/test: bellek içi depolama. Süreç yeniden başlayınca silinir. */
type Obj = { data: Buffer; contentType: string };
const g = globalThis as unknown as { __hilalMedia?: { priv: Map<string, Obj>; pub: Map<string, Obj> } };
const mem = (g.__hilalMedia ??= { priv: new Map(), pub: new Map() });

export function resetMemoryStorage() {
  mem.priv.clear();
  mem.pub.clear();
}

const secret = () => requiredSecret("SESSION_SECRET", "dev-only-session-secret-change-me-00000000");

export type UploadClaims = { path: string; contentType: string; maxBytes: number; exp: number };

export function signUploadToken(c: UploadClaims): string {
  const body = Buffer.from(JSON.stringify(c)).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(`upload:${body}`).digest("base64url")}`;
}

export function verifyUploadToken(token: string, now = Date.now()): UploadClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(`upload:${body}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const c = JSON.parse(Buffer.from(body, "base64url").toString()) as UploadClaims;
  return c.exp * 1000 > now ? c : null;
}

/** Demo yükleme uç noktasının yazdığı yer (route handler kullanır). */
export function memoryPutPrivate(path: string, data: Buffer, contentType: string) {
  mem.priv.set(path, { data, contentType });
}

export function memoryGet(area: "priv" | "pub", path: string): Obj | null {
  return mem[area].get(path) ?? null;
}

export function createMemoryStorage(): MediaStorage {
  return {
    kind: "memory",
    async createUploadTarget(path, contentType, maxBytes): Promise<UploadTarget> {
      const exp = Math.floor(Date.now() / 1000) + 15 * 60;
      const token = signUploadToken({ path, contentType, maxBytes, exp });
      return { url: `/api/admin/upload?token=${encodeURIComponent(token)}`, headers: { "content-type": contentType }, expiresAt: new Date(exp * 1000).toISOString() };
    },
    async readPrivate(path) {
      return mem.priv.get(path)?.data ?? null;
    },
    async writePrivate(path, data, contentType) {
      mem.priv.set(path, { data, contentType });
    },
    async removePrivate(paths) {
      for (const p of paths) mem.priv.delete(p);
    },
    async signedUrl(path) {
      // Yönetim önizleme uç noktası oturum kontrolü yapar; yol tahmin edilemez UUID içerir.
      return `/api/admin/media?path=${encodeURIComponent(path)}`;
    },
    async publish(privatePath, contentType) {
      const obj = mem.priv.get(privatePath);
      if (!obj) throw new Error("Özel dosya bulunamadı");
      const ext = privatePath.split(".").pop() ?? "bin";
      const publicPath = `${randomUUID()}.${ext}`;
      mem.pub.set(publicPath, { data: obj.data, contentType });
      return { publicPath, url: `/media/${publicPath}` };
    },
    async unpublish(paths) {
      for (const p of paths) mem.pub.delete(p);
    },
  };
}
