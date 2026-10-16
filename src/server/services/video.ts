import "server-only";

/**
 * Video konteyner doğrulaması — ffmpeg olmadan, yalnızca baytlarla.
 * Dönüştürme (transcoding) yapılmaz; tarayıcıların oynatabildiği MP4 (H.264/AAC)
 * ve WebM kabul edilir. Ölçek büyürse yönetilen bir video servisine geçilmesi
 * önerilir (bkz. docs/DEPENDENCY_EVALUATION.md).
 */
export type VideoContainer = "video/mp4" | "video/webm";

export function sniffVideo(head: Buffer): VideoContainer | null {
  if (head.length >= 12 && head.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = head.subarray(8, 12).toString("latin1");
    // QuickTime (qt  ) ve HEIF gibi görüntü markaları reddedilir
    if (["heic", "heix", "mif1", "msf1", "avif"].includes(brand)) return null;
    return "video/mp4";
  }
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return "video/webm";
  return null;
}

type Box = { type: string; start: number; size: number; header: number };

function* boxes(buf: Buffer, start: number, end: number): Generator<Box> {
  let off = start;
  while (off + 8 <= end) {
    let size = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("latin1");
    let header = 8;
    if (size === 1 && off + 16 <= end) {
      size = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (size === 0) size = end - off;
    if (size < header || off + size > end + 1e12) return;
    yield { type, start: off, size, header };
    off += size;
  }
}

/** MP4 meta verisi (moov kutusu dosyanın içindeyse): süre (sn) ve görüntü boyutu. */
export function parseMp4Metadata(buf: Buffer): { durationSeconds: number | null; width: number | null; height: number | null } {
  const out = { durationSeconds: null as number | null, width: null as number | null, height: null as number | null };
  for (const b of boxes(buf, 0, buf.length)) {
    if (b.type !== "moov") continue;
    const moovEnd = Math.min(b.start + b.size, buf.length);
    for (const c of boxes(buf, b.start + b.header, moovEnd)) {
      const p = c.start + c.header;
      if (c.type === "mvhd" && p + 32 <= buf.length) {
        const version = buf[p];
        const timescale = version === 1 ? buf.readUInt32BE(p + 20) : buf.readUInt32BE(p + 12);
        const duration = version === 1 ? Number(buf.readBigUInt64BE(p + 24)) : buf.readUInt32BE(p + 16);
        if (timescale > 0) out.durationSeconds = Math.round((duration / timescale) * 10) / 10;
      }
      if (c.type === "trak" && out.width === null) {
        for (const t of boxes(buf, p, Math.min(c.start + c.size, buf.length))) {
          if (t.type !== "tkhd") continue;
          const q = t.start + t.header;
          const version = buf[q];
          const wOff = q + (version === 1 ? 88 : 76);
          if (wOff + 8 <= buf.length) {
            const w = buf.readUInt32BE(wOff) / 65536;
            const h = buf.readUInt32BE(wOff + 4) / 65536;
            if (w > 0 && h > 0) {
              out.width = Math.round(w);
              out.height = Math.round(h);
            }
          }
        }
      }
    }
  }
  return out;
}
