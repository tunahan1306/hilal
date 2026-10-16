// Sentetik, gerçek kişiyi temsil etmeyen soyut profil görselleri üretir.
// Kullanım: node scripts/generate-demo-images.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/demo/", import.meta.url);
await mkdir(OUT, { recursive: true });

const palettes = [
  ["#dfe7e4", "#9fbfb6", "#3d6b62"], ["#ece4da", "#c9a98a", "#6b4f3a"], ["#e3e6ef", "#9aa6c7", "#3f4a6e"],
  ["#efe3e3", "#c79c9c", "#6e3f45"], ["#e6ecdf", "#a7bb8f", "#4b5f35"], ["#e9e4ef", "#ad9cc7", "#4e3f6e"],
  ["#f0eadc", "#d2b77c", "#6e5a2c"], ["#dde9ee", "#8fb7c7", "#2f5b6b"],
];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

for (let i = 1; i <= 24; i++) {
  const [bg, mid, fg] = palettes[(i - 1) % palettes.length];
  const blobs = Array.from({ length: 4 }, () => {
    const cx = Math.round(rnd() * 800), cy = Math.round(rnd() * 1000), r = Math.round(120 + rnd() * 260);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${mid}" opacity="${(0.18 + rnd() * 0.25).toFixed(2)}"/>`;
  }).join("");
  const headY = 380 + Math.round(rnd() * 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${mid}"/></linearGradient>
  <filter id="b"><feGaussianBlur stdDeviation="40"/></filter></defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <g filter="url(#b)">${blobs}</g>
  <circle cx="400" cy="${headY}" r="150" fill="${fg}" opacity="0.85"/>
  <path d="M110 1000 C 130 760, 260 640, 400 640 C 540 640, 670 760, 690 1000 Z" fill="${fg}" opacity="0.85"/>
</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 78 }).toFile(new URL(`avatar-${i}.webp`, OUT).pathname);
}
console.log("ok");
