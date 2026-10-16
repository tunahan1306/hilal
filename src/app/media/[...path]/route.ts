import { connection } from "next/server";
import { memoryGet } from "@/server/storage/memory";
import { isDemoMode } from "@/server/env";

/** Yalnızca demo modu: bellekte tutulan yüklenmiş görselleri sunar. */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  await connection();
  if (!isDemoMode()) return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!/^[0-9a-f-]+\.(webp|mp4|webm)$/i.test(key)) return new Response("Not found", { status: 404 });
  const file = memoryGet("pub", key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
