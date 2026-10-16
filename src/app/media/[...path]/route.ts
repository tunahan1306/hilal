import { connection } from "next/server";
import { readDemoFile } from "@/server/repositories/memory";
import { isDemoMode } from "@/server/env";

/** Yalnızca demo modu: bellekte tutulan yüklenmiş görselleri sunar. */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  await connection();
  if (!isDemoMode()) return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!/^[a-z0-9-]+\/[0-9a-f-]+\.webp$/i.test(key)) return new Response("Not found", { status: 404 });
  const file = readDemoFile(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
