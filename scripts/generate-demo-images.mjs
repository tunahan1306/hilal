// Sentetik, gerçek kişiyi temsil etmeyen soyut görseller üretir (demo verisi için).
// - portrait-N.webp : 1200x1500 (4:5) soyut portre — yumuşak ışık, film greni
// - scene-N.webp    : 1600x1200 (4:3) / 1200x1600 (3:4) soyut sahneler (sahil, şehir, doğa çağrışımı)
// Kullanım: node scripts/generate-demo-images.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/demo/", import.meta.url);
await mkdir(OUT, { recursive: true });

// Editoryal paletler: [zemin açık, zemin koyu, figür, ışık]
const PALETTES = [
  ["#e9e1d6", "#b9a48b", "#3b2f27", "#fff4e2"], // kum / kahve
  ["#dfe3dc", "#8e9a86", "#2b3328", "#f3f6ea"], // zeytin
  ["#e7dcd8", "#b98b80", "#3d2622", "#fff0ea"], // terakota
  ["#dadfe6", "#7f8ea3", "#232b36", "#eef3fa"], // arduvaz
  ["#ece6da", "#c2a56e", "#3a3020", "#fff7e0"], // pirinç
  ["#e2dde6", "#9a8aa6", "#2d2534", "#f5effa"], // lavanta gri
  ["#e5e0d8", "#a19a8f", "#2a2723", "#faf6ef"], // nötr gri
  ["#dfe6e4", "#7fa39d", "#203230", "#ecf7f4"], // deniz
];

let seed = 1337;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

async function grain(width, height) {
  const noise = await sharp({ create: { width, height, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 28 } } })
    .greyscale()
    .png()
    .toBuffer();
  return { input: noise };
}

async function finish(svg, w, h, file) {
  const base = sharp(Buffer.from(svg)).resize(w, h);
  const g = await grain(w, h);
  // sharp composite 'opacity' alanı desteklenmez; greni ayrı katman olarak düşük yoğunlukta uygula
  const grainLayer = await sharp(g.input).ensureAlpha(0.18).png().toBuffer();
  await base
    .composite([{ input: grainLayer, blend: "soft-light" }])
    .webp({ quality: 82 })
    .toFile(new URL(file, OUT).pathname);
}

function portraitSvg(p, variant) {
  const [light, dark, figure, glow] = p;
  const side = rnd() > 0.5 ? 1 : -1; // ışığın geldiği yön
  const lx = 600 + side * (250 + rnd() * 250), ly = 250 + rnd() * 250;
  const cx = 600 + (rnd() - 0.5) * 140; // figürün yatay konumu
  const hy = 560 + (rnd() - 0.5) * 80; // baş merkezi
  const hw = 150 + rnd() * 30, hh = 190 + rnd() * 25; // baş yarıçapları
  const sw = 380 + rnd() * 90; // omuz yarı genişliği
  const hairVol = variant % 3; // saç hacmi varyasyonu
  // Baş, boyun ve omuzları tek, yumuşak bir büst siluetinde birleştir
  const st = hy + hh + 120 + rnd() * 50; // omuz hattı başa göre konumlanır (boyun orantılı kalır)
  const bust = `M ${cx - sw} 1500
    C ${cx - sw} ${st + 190}, ${cx - sw * 0.82} ${st + 50}, ${cx - 150} ${st}
    C ${cx - 95} ${st - 20}, ${cx - 80} ${hy + hh + 40}, ${cx - 85} ${hy + hh * 0.55}
    C ${cx - hw - 10} ${hy + hh * 0.4}, ${cx - hw - 6} ${hy - hh}, ${cx} ${hy - hh - 6}
    C ${cx + hw + 6} ${hy - hh}, ${cx + hw + 10} ${hy + hh * 0.4}, ${cx + 85} ${hy + hh * 0.55}
    C ${cx + 80} ${hy + hh + 40}, ${cx + 95} ${st - 20}, ${cx + 150} ${st}
    C ${cx + sw * 0.82} ${st + 50}, ${cx + sw} ${st + 190}, ${cx + sw} 1500 Z`;
  const hair = hairVol === 0 ? "" : `<path d="M ${cx - hw - 30 * hairVol} ${hy - 20}
    C ${cx - hw - 40 * hairVol} ${hy + 200 + 80 * hairVol}, ${cx - 120} ${hy + 330 + 60 * hairVol}, ${cx - 60} ${hy + 360 + 60 * hairVol}
    L ${cx + 60} ${hy + 360 + 60 * hairVol}
    C ${cx + 120} ${hy + 330 + 60 * hairVol}, ${cx + hw + 40 * hairVol} ${hy + 200 + 80 * hairVol}, ${cx + hw + 30 * hairVol} ${hy - 20}
    C ${cx + hw} ${hy - hh - 40}, ${cx - hw} ${hy - hh - 40}, ${cx - hw - 30 * hairVol} ${hy - 20} Z" fill="url(#fig)"/>`;
  const streaks = Array.from({ length: 3 }, () => {
    const x = rnd() * 1200;
    return `<rect x="${x}" y="-200" width="${60 + rnd() * 120}" height="1900" fill="${glow}" opacity="${0.12 + rnd() * 0.14}" transform="rotate(${side * (12 + rnd() * 10)} ${x} 750)"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <radialGradient id="bg" cx="${lx / 1200}" cy="${ly / 1500}" r="1.05">
      <stop offset="0" stop-color="${glow}"/><stop offset="0.4" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
    </radialGradient>
    <linearGradient id="fig" x1="${side > 0 ? 1 : 0}" y1="0" x2="${side > 0 ? 0 : 1}" y2="0.6">
      <stop offset="0" stop-color="${dark}"/><stop offset="0.35" stop-color="${figure}" stop-opacity="0.92"/><stop offset="1" stop-color="${figure}"/>
    </linearGradient>
    <filter id="dof"><feGaussianBlur stdDeviation="${16 + rnd() * 10}"/></filter>
    <filter id="haze"><feGaussianBlur stdDeviation="60"/></filter>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.78"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#bg)"/>
  <g filter="url(#haze)">${streaks}</g>
  <g filter="url(#dof)">${hair}<path d="${bust}" fill="url(#fig)"/></g>
  <rect width="1200" height="1500" fill="url(#vig)"/>
</svg>`;
}

function sceneSvg(p, kind, w, h) {
  const [light, dark, figure, glow] = p;
  const horizon = h * (0.45 + rnd() * 0.2);
  const sunX = w * (0.2 + rnd() * 0.6), sunR = Math.min(w, h) * (0.06 + rnd() * 0.06);
  const hills = Array.from({ length: 3 }, (_, i) => {
    const y = horizon + i * h * 0.08;
    const a = y - h * (0.05 + rnd() * 0.08), b = y - h * (0.02 + rnd() * 0.08);
    return `<path d="M0 ${y} C ${w * 0.25} ${a}, ${w * 0.6} ${b}, ${w} ${y - h * 0.03} L ${w} ${h} L 0 ${h} Z" fill="${i === 2 ? figure : dark}" opacity="${0.35 + i * 0.25}"/>`;
  }).join("");
  const towers = Array.from({ length: 14 }, (_, i) => {
    const bw = w / 14, bh = h * (0.08 + rnd() * 0.22);
    return `<rect x="${i * bw - bw * 0.2 * rnd()}" y="${horizon - bh}" width="${bw * (0.5 + rnd() * 0.6)}" height="${bh + h}" fill="${figure}" opacity="${0.25 + rnd() * 0.45}"/>`;
  }).join("");
  const sea = `<rect x="0" y="${horizon}" width="${w}" height="${h - horizon}" fill="${dark}" opacity="0.85"/>` +
    Array.from({ length: 18 }, (_, i) => `<rect x="${rnd() * w}" y="${horizon + 8 + i * ((h - horizon) / 18)}" width="${w * (0.05 + rnd() * 0.2)}" height="2" fill="${glow}" opacity="${0.15 + rnd() * 0.3}"/>`).join("");
  const body = kind === "city" ? towers : kind === "sea" ? sea : hills;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${glow}"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${kind === "city" ? 14 : 8}"/></filter>
    <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${glow}" stop-opacity="0"/><stop offset="${horizon / h}" stop-color="${glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.8"><stop offset="0.65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${horizon - sunR * 1.6}" r="${sunR * 3}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${horizon - sunR * 1.6}" r="${sunR}" fill="${glow}" opacity="0.9"/>
  <g filter="url(#soft)">${body}</g>
  <rect width="${w}" height="${h}" fill="url(#fog)"/>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>
</svg>`;
}

for (let i = 1; i <= 30; i++) {
  await finish(portraitSvg(PALETTES[(i - 1) % PALETTES.length], i), 1200, 1500, `portrait-${i}.webp`);
}
const kinds = ["sea", "city", "hills"];
for (let i = 1; i <= 24; i++) {
  const landscape = i % 3 !== 0;
  const [w, h] = landscape ? [1600, 1200] : [1200, 1600];
  await finish(sceneSvg(pick(PALETTES), kinds[i % 3], w, h), w, h, `scene-${i}.webp`);
}
console.log("ok: 30 portre, 24 sahne");
