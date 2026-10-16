// Uzun ekran görüntülerini incelemek için parçalara böler: node scripts/slice-image.mjs <dosya.png> [yükseklik]
import sharp from "sharp";
const [, , file, h = "1000"] = process.argv;
const meta = await sharp(file).metadata();
let i = 0;
for (let top = 0; top < meta.height; top += Number(h), i++) {
  await sharp(file).extract({ left: 0, top, width: meta.width, height: Math.min(Number(h), meta.height - top) }).toFile(file.replace(".png", `.part${i}.png`));
}
console.log(i, "parça");
