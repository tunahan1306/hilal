// Sentetik, soyut demo videoları üretir (gerçek kişi içermez): Chromium'da canvas
// animasyonu MediaRecorder ile WebM (VP9) olarak kaydedilir; poster ilk kareden alınır.
// Kullanım: node scripts/generate-demo-videos.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const OUT = new URL("../public/demo/", import.meta.url);
await mkdir(OUT, { recursive: true });
const PALETTES = [["#e9e1d6", "#b9a48b", "#3b2f27", "#fff4e2"], ["#dfe6e4", "#7fa39d", "#203230", "#ecf7f4"], ["#dadfe6", "#7f8ea3", "#232b36", "#eef3fa"]];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c width=720 height=900></canvas>");
for (let i = 0; i < PALETTES.length; i++) {
  const result = await page.evaluate(async ({ pal, seconds }) => {
    const c = document.getElementById("c");
    const ctx = c.getContext("2d");
    const [light, mid, dark, glow] = pal;
    const draw = (t) => {
      const g = ctx.createLinearGradient(0, 0, 0, 900);
      g.addColorStop(0, light); g.addColorStop(1, mid);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 900);
      // Yavaş hareket eden ışık ve ufuk (sahil / gün batımı çağrışımı)
      const sx = 360 + Math.sin(t * 0.6) * 160, sy = 380 + Math.cos(t * 0.4) * 30;
      const r = ctx.createRadialGradient(sx, sy, 10, sx, sy, 320);
      r.addColorStop(0, glow); r.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = r; ctx.fillRect(0, 0, 720, 900);
      ctx.fillStyle = dark; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(0, 620);
      for (let x = 0; x <= 720; x += 20) ctx.lineTo(x, 620 + Math.sin(x / 90 + t * 1.4) * 10);
      ctx.lineTo(720, 900); ctx.lineTo(0, 900); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.25; ctx.fillStyle = glow;
      for (let k = 0; k < 14; k++) ctx.fillRect((k * 61 + t * 40) % 720, 650 + k * 16, 80, 2);
      ctx.globalAlpha = 1;
    };
    draw(0);
    const poster = c.toDataURL("image/png");
    const stream = c.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 1_200_000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((res) => (rec.onstop = res));
    rec.start(250);
    const start = performance.now();
    await new Promise((res) => {
      const frame = () => {
        const t = (performance.now() - start) / 1000;
        draw(t);
        if (t < seconds) requestAnimationFrame(frame); else res();
      };
      requestAnimationFrame(frame);
    });
    rec.stop();
    await done;
    const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
    let bin = ""; const bytes = new Uint8Array(buf);
    for (let j = 0; j < bytes.length; j += 0x8000) bin += String.fromCharCode(...bytes.subarray(j, j + 0x8000));
    return { video: btoa(bin), poster };
  }, { pal: PALETTES[i], seconds: 6 });
  await writeFile(new URL(`video-${i + 1}.webm`, OUT), Buffer.from(result.video, "base64"));
  await sharp(Buffer.from(result.poster.split(",")[1], "base64")).webp({ quality: 80 }).toFile(new URL(`video-${i + 1}-poster.webp`, OUT).pathname);
}
await browser.close();
console.log("ok");
