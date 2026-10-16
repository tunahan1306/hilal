import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MediaStorage } from "./types";

export const PRIVATE_BUCKET = "media-private";
export const PUBLIC_BUCKET = "media-public";

let client: SupabaseClient | null = null;
function service(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function must<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("Depolama yanıtı boş");
  return res.data as NonNullable<T>;
}

export function createSupabaseStorage(): MediaStorage {
  return {
    kind: "supabase",
    async createUploadTarget(path, contentType) {
      // İmzalı yükleme adresi (2 saat geçerli); dosya doğrudan özel bucket'a gider,
      // uygulama sunucusundan geçmez. Boyut sınırı bucket ayarı + işleme adımında yeniden doğrulanır.
      const data = must(await service().storage.from(PRIVATE_BUCKET).createSignedUploadUrl(path));
      return { url: data.signedUrl, headers: { "content-type": contentType, "x-upsert": "false" }, expiresAt: new Date(Date.now() + 2 * 3600_000).toISOString() };
    },
    async readPrivate(path) {
      const res = await service().storage.from(PRIVATE_BUCKET).download(path);
      if (res.error) return null;
      return Buffer.from(await res.data.arrayBuffer());
    },
    async writePrivate(path, data, contentType) {
      must(await service().storage.from(PRIVATE_BUCKET).upload(path, data, { contentType, upsert: true }));
    },
    async removePrivate(paths) {
      if (paths.length) must(await service().storage.from(PRIVATE_BUCKET).remove(paths));
    },
    async signedUrl(path, expiresInSeconds) {
      return must(await service().storage.from(PRIVATE_BUCKET).createSignedUrl(path, expiresInSeconds)).signedUrl;
    },
    async publish(privatePath, contentType) {
      const ext = privatePath.split(".").pop() ?? "bin";
      const publicPath = `${randomUUID()}.${ext}`;
      const file = await service().storage.from(PRIVATE_BUCKET).download(privatePath);
      if (file.error) throw new Error(file.error.message);
      must(await service().storage.from(PUBLIC_BUCKET).upload(publicPath, file.data, { contentType, upsert: false, cacheControl: "31536000" }));
      return { publicPath, url: service().storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl };
    },
    async unpublish(paths) {
      if (paths.length) must(await service().storage.from(PUBLIC_BUCKET).remove(paths));
    },
  };
}
